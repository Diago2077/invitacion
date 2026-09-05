import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { Cargando } from '@/components/ui/estado'
import Login from '@/pages/Login'
import NoEncontrado from '@/pages/NoEncontrado'

/**
 * Todo se carga por demanda salvo el login y el layout.
 *
 * El motivo no es el peso del panel, que es chico: es que la invitacion la
 * abre gente desde el celular, con datos moviles y una sola vez. No tiene
 * por que descargar el codigo del panel para ver una foto y apretar
 * "confirmo".
 */
const Inicio = lazy(() => import('@/pages/Inicio'))
const Eventos = lazy(() => import('@/pages/Eventos'))
const EventoDetalle = lazy(() => import('@/pages/EventoDetalle'))
const VistaPrevia = lazy(() => import('@/pages/VistaPrevia'))
const Invitacion = lazy(() => import('@/pages/publico/Invitacion'))
const Reporte = lazy(() => import('@/pages/publico/Reporte'))

function Perezoso({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Cargando className="min-h-screen" />}>{children}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Publico: sin login. El token es lo unico que da acceso. */}
      <Route
        path="/i/:slug/:token"
        element={
          <Perezoso>
            <Invitacion />
          </Perezoso>
        }
      />
      {/* Mismo destino sin la parte legible, por si alguien recorta el link */}
      <Route
        path="/i/:token"
        element={
          <Perezoso>
            <Invitacion />
          </Perezoso>
        }
      />
      <Route
        path="/r/:token"
        element={
          <Perezoso>
            <Reporte />
          </Perezoso>
        }
      />

      {/*
        Fuera del AppLayout: la vista previa ocupa la pantalla entera, como la
        invitacion de verdad. No lleva guardia propia porque la RLS ya la
        tiene: sin sesion de super_admin, el evento no se lee.
      */}
      <Route
        path="/eventos/:id/vista-previa"
        element={
          <Perezoso>
            <VistaPrevia />
          </Perezoso>
        }
      />

      <Route path="/" element={<AppLayout />}>
        <Route
          index
          element={
            <Perezoso>
              <Inicio />
            </Perezoso>
          }
        />
        <Route
          path="eventos"
          element={
            <Perezoso>
              <Eventos />
            </Perezoso>
          }
        />
        <Route
          path="eventos/:id"
          element={
            <Perezoso>
              <EventoDetalle />
            </Perezoso>
          }
        />
      </Route>

      <Route path="*" element={<NoEncontrado />} />
    </Routes>
  )
}
