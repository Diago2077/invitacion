-- ═══════════════════════════════════════════════════════════════════════════
-- 008_reporte_token_invitados.sql — El reporte del cliente ahora puede
-- compartir el link personal de cada invitado
--
-- Decision consciente: hasta ahora reporte_por_token ocultaba el token de
-- cada invitacion a proposito, para que el cliente no pudiera confirmar en
-- nombre de sus invitados desde ese link de solo lectura (ver comentario
-- original en 004_rpc_publico.sql). El cliente pidio poder reenviar el link
-- de cada invitado desde ahi mismo, asi que se revierte esa restriccion:
-- ahora sale el token (y el slug del evento, para armar la URL /i/...).
--
-- Con esto, quien tenga el link del reporte pasa a tener tambien el link
-- personal de cada invitado. Sigue sin poder confirmar nada desde el
-- reporte en si (esa funcion es aparte), pero si puede abrir cada link y
-- confirmar como si fuera ese invitado. Es un tradeoff aceptado: el link
-- del reporte solo se le pasa a los novios, igual que antes.
-- ═══════════════════════════════════════════════════════════════════════════

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
      'slug', v_ev.slug,
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
        'token', inv.token,
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
