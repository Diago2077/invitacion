-- ═══════════════════════════════════════════════════════════════════════════
-- 004_rpc_publico.sql — La cara publica del sistema
--
-- Todo lo que ve alguien sin login pasa por estas tres funciones, y por
-- ninguna tabla. Son security definer, asi que la RLS no las frena, y por
-- eso cada una arma a mano el jsonb que devuelve: lo que no se nombra aca,
-- no sale. Nunca se expone el id del evento, ni las notas internas, ni los
-- tokens de las demas invitaciones.
--
--   invitacion_por_token   → lo que abre el invitado
--   confirmar_invitacion   → su respuesta (el unico write publico que existe)
--   reporte_por_token      → el tablero de solo lectura del cliente
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- invitacion_por_token — devuelve evento + invitacion + invitados
--
-- Devuelve null si el token no existe: no distingue "no existe" de
-- "existe pero esta archivado", para no confirmar tokens a quien tantee.
--
-- Si el evento esta en borrador igual devuelve el contenido, con
-- puede_confirmar = false: asi el mismo link sirve de vista previa para el
-- admin antes de publicar, sin necesitar una ruta aparte.
-- ─────────────────────────────────────────────────────────────
create or replace function public.invitacion_por_token(p_token text)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_inv invitaciones;
  v_ev eventos;
  v_puede boolean;
  v_motivo text;
begin
  if p_token is null or length(p_token) < 6 then
    return null;
  end if;

  select * into v_inv from invitaciones where token = p_token;
  if not found then return null; end if;

  select * into v_ev from eventos where id = v_inv.evento_id;
  if not found or v_ev.estado = 'archivado' then return null; end if;

  -- Acuse de recibo. Solo cuenta cuando el evento esta publicado: las
  -- aperturas del admin probando el borrador no son "el invitado lo vio".
  if v_ev.estado = 'publicado' then
    update invitaciones
      set vistas = vistas + 1,
          visto_at = coalesce(visto_at, now())
      where id = v_inv.id;
  end if;

  if v_ev.estado <> 'publicado' then
    v_puede := false;
    v_motivo := case when v_ev.estado = 'cerrado'
      then 'Las confirmaciones para este evento ya estan cerradas.'
      else 'Vista previa: la invitacion todavia no fue publicada.' end;
  elsif v_ev.confirmar_hasta is not null and v_ev.confirmar_hasta < current_date then
    v_puede := false;
    v_motivo := 'El plazo para confirmar vencio el ' ||
      to_char(v_ev.confirmar_hasta, 'DD/MM/YYYY') || '.';
  else
    v_puede := true;
    v_motivo := null;
  end if;

  return jsonb_build_object(
    'evento', jsonb_build_object(
      'nombre', v_ev.nombre,
      'tipo', v_ev.tipo,
      'slug', v_ev.slug,
      'fecha_evento', v_ev.fecha_evento,
      'plantilla', v_ev.plantilla,
      'contenido', v_ev.contenido,
      'confirmar_hasta', v_ev.confirmar_hasta,
      'estado', v_ev.estado
    ),
    'invitacion', jsonb_build_object(
      'token', v_inv.token,
      'nombre_grupo', v_inv.nombre_grupo,
      'saludo', v_inv.saludo,
      'modo_pases', v_inv.modo_pases,
      'pases', v_inv.pases,
      'estado', v_inv.estado,
      'pases_confirmados', v_inv.pases_confirmados,
      'mensaje_invitado', v_inv.mensaje_invitado,
      'confirmado_at', v_inv.confirmado_at,
      'mesa', v_inv.mesa
    ),
    'invitados', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'nombre', i.nombre,
        'es_menor', i.es_menor,
        'asiste', i.asiste,
        'restriccion', i.restriccion,
        'origen', i.origen
      ) order by i.orden, i.created_at)
      from invitados i where i.invitacion_id = v_inv.id
    ), '[]'::jsonb),
    'puede_confirmar', v_puede,
    'motivo', v_motivo
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- confirmar_invitacion — la respuesta del invitado
--
-- El unico write que puede disparar alguien sin login, asi que los limites
-- se validan ACA y no en el front: el front se puede saltear mandando el
-- POST a mano.
--
-- Forma de p_invitados segun el modo:
--   nominal → [{"id": uuid, "asiste": bool, "restriccion": text}]
--   cupo    → [{"nombre": text, "es_menor": bool, "restriccion": text}]
--   abierto → igual que cupo (opcional)
--
-- Se puede volver a confirmar: la ultima respuesta pisa a la anterior en
-- "invitaciones", pero todas quedan en "confirmaciones".
-- ─────────────────────────────────────────────────────────────
create or replace function public.confirmar_invitacion(
  p_token text,
  p_asiste boolean,
  p_pases int default null,
  p_invitados jsonb default '[]'::jsonb,
  p_mensaje text default null
)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_inv invitaciones;
  v_ev eventos;
  v_pases int := 0;
  v_total int;
  v_estado text;
  v_mensaje text := nullif(btrim(coalesce(p_mensaje, '')), '');
begin
  if p_token is null or length(p_token) < 6 then
    return jsonb_build_object('ok', false, 'error', 'Link invalido.');
  end if;

  select * into v_inv from invitaciones where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Link invalido.');
  end if;

  select * into v_ev from eventos where id = v_inv.evento_id;
  if not found or v_ev.estado <> 'publicado' then
    return jsonb_build_object('ok', false, 'error',
      'Esta invitacion no esta recibiendo confirmaciones.');
  end if;

  if v_ev.confirmar_hasta is not null and v_ev.confirmar_hasta < current_date then
    return jsonb_build_object('ok', false, 'error',
      'El plazo para confirmar vencio el ' ||
      to_char(v_ev.confirmar_hasta, 'DD/MM/YYYY') || '.');
  end if;

  if coalesce(p_asiste, false) = false then
    -- No va nadie: se guarda igual (un "no" confirmado vale tanto como un
    -- "si" para armar las mesas) y se limpia lo que hubiera respondido antes.
    update invitados set asiste = false
      where invitacion_id = v_inv.id and origen = 'admin';
    delete from invitados where invitacion_id = v_inv.id and origen = 'invitado';
    v_pases := 0;
    v_estado := 'rechazado';

  elsif v_inv.modo_pases = 'nominal' then
    select count(*) into v_total
      from invitados where invitacion_id = v_inv.id and origen = 'admin';

    if v_total = 0 then
      -- Nominal sin nombres cargados: no hay a quien marcar, se toma como
      -- una confirmacion simple de una persona.
      v_pases := 1;
      v_estado := 'confirmado';
    else
      -- Se compara i.id::text contra el string recibido en vez de castear el
      -- string a uuid: un "id" cualquiera mandado a mano no coincide con
      -- nada, en lugar de reventar la funcion con un error de casteo.
      update invitados i
        set asiste = lower(coalesce(e.valor->>'asiste', '')) in ('true', 't', '1'),
            restriccion = nullif(btrim(coalesce(e.valor->>'restriccion', '')), '')
        from jsonb_array_elements(coalesce(p_invitados, '[]'::jsonb)) as e(valor)
        where i.invitacion_id = v_inv.id
          and i.origen = 'admin'
          and i.id::text = e.valor->>'id';

      select count(*) filter (where asiste) into v_pases
        from invitados where invitacion_id = v_inv.id and origen = 'admin';

      v_estado := case
        when v_pases = 0 then 'rechazado'
        when v_pases = v_total then 'confirmado'
        else 'parcial' end;
    end if;

  else
    -- cupo / abierto: el numero lo pone el invitado, con el tope que fijo
    -- el admin. En cupo el tope es obligatorio; en abierto puede no haber.
    v_pases := greatest(coalesce(p_pases, 1), 1);

    if v_inv.modo_pases = 'cupo' then
      v_total := coalesce(v_inv.pases, 1);
      if v_pases > v_total then
        return jsonb_build_object('ok', false, 'error',
          'Tu invitacion tiene ' || v_total || ' lugares.');
      end if;
      v_estado := case when v_pases = v_total then 'confirmado' else 'parcial' end;
    else
      if v_inv.pases is not null and v_pases > v_inv.pases then
        return jsonb_build_object('ok', false, 'error',
          'Como maximo pueden asistir ' || v_inv.pases || ' personas.');
      end if;
      v_estado := 'confirmado';
    end if;

    -- Los nombres que sumo el invitado se rehacen en cada respuesta; los
    -- que cargo el admin (si habia) no se tocan nunca.
    delete from invitados where invitacion_id = v_inv.id and origen = 'invitado';

    insert into invitados (invitacion_id, orden, nombre, es_menor, restriccion, asiste, origen)
    select
      v_inv.id,
      100 + (e.orden::int),
      btrim(e.valor->>'nombre'),
      lower(coalesce(e.valor->>'es_menor', '')) in ('true', 't', '1'),
      nullif(btrim(coalesce(e.valor->>'restriccion', '')), ''),
      true,
      'invitado'
    from jsonb_array_elements(coalesce(p_invitados, '[]'::jsonb))
      with ordinality as e(valor, orden)
    where btrim(coalesce(e.valor->>'nombre', '')) <> ''
      and e.orden <= v_pases;
  end if;

  update invitaciones
    set estado = v_estado,
        pases_confirmados = v_pases,
        mensaje_invitado = v_mensaje,
        confirmado_at = now()
    where id = v_inv.id;

  insert into confirmaciones (invitacion_id, asiste, pases, invitados, mensaje)
  values (v_inv.id, coalesce(p_asiste, false), v_pases, p_invitados, v_mensaje);

  return jsonb_build_object(
    'ok', true,
    'estado', v_estado,
    'pases_confirmados', v_pases
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- reporte_por_token — el tablero que ve el cliente
--
-- Solo lectura y con su propio token, distinto al de cualquier invitacion:
-- quien tenga este link ve la lista completa, pero no puede tocar nada ni
-- entrar al panel. Tampoco salen los tokens de las invitaciones, para que
-- el cliente no pueda confirmar por sus invitados desde aca.
-- ─────────────────────────────────────────────────────────────
create or replace function public.reporte_por_token(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_ev eventos;
begin
  if p_token is null or length(p_token) < 6 then
    return null;
  end if;

  select * into v_ev from eventos where reporte_token = p_token and estado <> 'archivado';
  if not found then return null; end if;

  return jsonb_build_object(
    'evento', jsonb_build_object(
      'nombre', v_ev.nombre,
      'tipo', v_ev.tipo,
      'fecha_evento', v_ev.fecha_evento,
      'confirmar_hasta', v_ev.confirmar_hasta,
      'estado', v_ev.estado
    ),
    'totales', (
      select jsonb_build_object(
        'invitaciones', count(*),
        'confirmadas', count(*) filter (where estado in ('confirmado', 'parcial')),
        'rechazadas', count(*) filter (where estado = 'rechazado'),
        'pendientes', count(*) filter (where estado = 'pendiente'),
        'vistas', count(*) filter (where visto_at is not null),
        'personas_confirmadas', coalesce(sum(pases_confirmados), 0),
        'personas_invitadas', coalesce(sum(
          case
            when modo_pases = 'nominal' then greatest((
              select count(*) from invitados i
              where i.invitacion_id = inv.id and i.origen = 'admin'
            ), 1)
            else coalesce(pases, 1)
          end
        ), 0)
      )
      from invitaciones inv where inv.evento_id = v_ev.id
    ),
    'invitaciones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nombre_grupo', inv.nombre_grupo,
        'estado', inv.estado,
        'modo_pases', inv.modo_pases,
        'pases', inv.pases,
        'pases_confirmados', inv.pases_confirmados,
        'telefono', inv.telefono,
        'mesa', inv.mesa,
        'mensaje_invitado', inv.mensaje_invitado,
        'confirmado_at', inv.confirmado_at,
        'visto_at', inv.visto_at,
        'invitados', coalesce((
          select jsonb_agg(jsonb_build_object(
            'nombre', i.nombre,
            'asiste', i.asiste,
            'es_menor', i.es_menor,
            'restriccion', i.restriccion
          ) order by i.orden, i.created_at)
          from invitados i where i.invitacion_id = inv.id
        ), '[]'::jsonb)
      ) order by inv.nombre_grupo)
      from invitaciones inv where inv.evento_id = v_ev.id
    ), '[]'::jsonb)
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Permisos
--
-- anon puede EJECUTAR estas tres y nada mas (las tablas ya le fueron
-- revocadas en 002_rls.sql). "public" incluye a cualquier rol futuro, asi
-- que primero se revoca de ahi y despues se concede nombrando a quien va.
-- ─────────────────────────────────────────────────────────────
revoke all on function public.invitacion_por_token(text) from public;
revoke all on function public.confirmar_invitacion(text, boolean, int, jsonb, text) from public;
revoke all on function public.reporte_por_token(text) from public;

grant execute on function public.invitacion_por_token(text) to anon, authenticated;
grant execute on function public.confirmar_invitacion(text, boolean, int, jsonb, text) to anon, authenticated;
grant execute on function public.reporte_por_token(text) to anon, authenticated;
