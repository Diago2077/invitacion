import { Download, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorBox } from '@/components/ui/estado'
import { Modal } from '@/components/ui/modal'
import type { Evento, InvitacionConInvitados, ModoPases } from '@/lib/database.types'
import { leerTextoArchivo, parseCsv } from '@/lib/csv'
import { descargarCsv } from '@/lib/exportar'
import { normalizar } from '@/lib/format'
import { parseXlsx } from '@/lib/xlsx'
import { MODO_LABEL } from '@/lib/pases'

/**
 * Columnas esperadas, en este orden. Solo la primera es obligatoria.
 *
 * Los integrantes van en UNA celda separados por "|" y no por coma ni por
 * punto y coma: esos dos son separadores de columna en los CSV que exporta
 * Excel, y partirian la fila al medio.
 */
const COLUMNAS = ['Grupo', 'Integrantes', 'Pases', 'Modo', 'Telefono', 'Email', 'Mesa', 'Notas']

const EJEMPLO = [
  COLUMNAS,
  ['Familia Gonzalez', 'Maria Gonzalez|Jorge Gonzalez', '', 'nominal', '0981123456', '', '7', ''],
  ['Lucia Ramirez', '', '2', 'cupo', '0982777888', 'lucia@mail.com', '', 'Amiga de la novia'],
  ['Los del futbol', '', '', 'abierto', '', '', '', 'Que digan ellos cuantos vienen'],
]

interface Fila {
  nombre_grupo: string
  nombres: string[]
  pases: number | null
  modo_pases: ModoPases
  telefono: string | null
  email: string | null
  mesa: string | null
  notas: string | null
  duplicado: boolean
}

function modoDe(valor: string | undefined): ModoPases | null {
  const v = normalizar(valor ?? '')
  if (v.startsWith('nomin') || v.startsWith('person')) return 'nominal'
  if (v.startsWith('cupo') || v.startsWith('lugar')) return 'cupo'
  if (v.startsWith('abiert') || v.startsWith('libre')) return 'abierto'
  return null
}

export function ImportarModal({
  abierto,
  evento,
  existentes,
  onCerrar,
  onImportar,
}: {
  abierto: boolean
  evento: Evento
  existentes: InvitacionConInvitados[]
  onCerrar: () => void
  onImportar: (filas: Fila[]) => Promise<{ error: string | null }>
}) {
  const inputArchivo = useRef<HTMLInputElement>(null)
  const [filas, setFilas] = useState<Fila[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)

  const nuevas = filas.filter((f) => !f.duplicado)

  function cerrar() {
    setFilas([])
    setError(null)
    onCerrar()
  }

  async function onArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return

    setError(null)
    try {
      const esExcel = /\.xlsx?$/i.test(archivo.name)
      const crudas = esExcel ? await parseXlsx(archivo) : parseCsv(await leerTextoArchivo(archivo))

      const primera = crudas[0]?.map((v) => normalizar(v))
      const tieneEncabezado =
        primera?.[0] === 'grupo' || primera?.[0] === 'nombre' || primera?.[0] === 'familia'
      const datos = tieneEncabezado ? crudas.slice(1) : crudas

      const yaEstan = new Set(existentes.map((i) => normalizar(i.nombre_grupo)))
      const vistos = new Set<string>()

      const parseadas: Fila[] = datos
        .map((f) => {
          const nombre_grupo = (f[0] ?? '').trim()
          const nombres = (f[1] ?? '')
            .split(/[|/]/)
            .map((n) => n.trim())
            .filter(Boolean)
          const pasesTexto = (f[2] ?? '').trim()
          const pases = pasesTexto ? Number(pasesTexto.replace(/\D/g, '')) : null

          // Si no dicen el modo, se deduce de lo que trajeron: nombres →
          // nominal, un numero → cupo, nada → lo que tenga el evento.
          const modo_pases =
            modoDe(f[3]) ??
            (nombres.length > 0 ? 'nominal' : pases ? 'cupo' : evento.modo_pases_default)

          const clave = normalizar(nombre_grupo)
          const duplicado = yaEstan.has(clave) || vistos.has(clave)
          if (clave) vistos.add(clave)

          return {
            nombre_grupo,
            nombres,
            pases: modo_pases === 'nominal' ? null : Number.isFinite(pases) ? pases : null,
            modo_pases,
            telefono: (f[4] ?? '').trim() || null,
            email: (f[5] ?? '').trim() || null,
            mesa: (f[6] ?? '').trim() || null,
            notas: (f[7] ?? '').trim() || null,
            duplicado,
          }
        })
        .filter((f) => f.nombre_grupo)

      if (parseadas.length === 0) {
        setError('El archivo no tiene filas validas. La primera columna tiene que ser el grupo.')
        return
      }
      setFilas(parseadas)
    } catch {
      setError('No se pudo leer el archivo.')
    }
  }

  async function importar() {
    if (importando || nuevas.length === 0) return
    setImportando(true)
    const { error: err } = await onImportar(nuevas)
    setImportando(false)
    if (err) {
      setError(err)
      return
    }
    cerrar()
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Importar lista de invitados"
      descripcion="Desde un Excel (.xlsx) o un CSV."
      onCerrar={cerrar}
      ancho="max-w-3xl"
      footer={
        <>
          <Button variant="outline" onClick={cerrar} disabled={importando}>
            Cancelar
          </Button>
          <Button onClick={importar} disabled={importando || nuevas.length === 0}>
            {importando ? 'Importando…' : `Importar ${nuevas.length}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-secondary/50 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Columnas, en este orden:</p>
          <p className="mt-1">{COLUMNAS.join(' · ')}</p>
          <p className="mt-2">
            Solo <strong>Grupo</strong> es obligatorio. Los integrantes van en una sola celda
            separados por <code className="rounded bg-card px-1">|</code>. Si no ponés el modo, se
            deduce: con nombres queda “{MODO_LABEL.nominal}”, con un numero “{MODO_LABEL.cupo}”.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => descargarCsv('plantilla-invitados', EJEMPLO)}
          >
            <Download /> Descargar plantilla de ejemplo
          </Button>
        </div>

        <input
          ref={inputArchivo}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          className="hidden"
          onChange={onArchivo}
        />
        <Button variant="outline" onClick={() => inputArchivo.current?.click()}>
          <Upload /> Elegir archivo
        </Button>

        {error && <ErrorBox mensaje={error} />}

        {filas.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{nuevas.length}</span> para importar
              {filas.length !== nuevas.length && (
                <> · {filas.length - nuevas.length} repetidos que se van a saltear</>
              )}
            </p>
            <div className="max-h-72 overflow-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Grupo</th>
                    <th className="px-3 py-2 font-medium">Integrantes</th>
                    <th className="px-3 py-2 font-medium">Modo</th>
                    <th className="px-3 py-2 font-medium">Pases</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => (
                    <tr
                      key={`${f.nombre_grupo}-${i}`}
                      className={
                        'border-b border-border last:border-0 ' +
                        (f.duplicado ? 'text-muted-foreground line-through' : '')
                      }
                    >
                      <td className="px-3 py-1.5">{f.nombre_grupo}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {f.nombres.join(', ') || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {MODO_LABEL[f.modo_pases]}
                      </td>
                      <td className="px-3 py-1.5 tabular text-muted-foreground">
                        {f.modo_pases === 'nominal' ? f.nombres.length : (f.pases ?? '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export type FilaImportada = Fila
