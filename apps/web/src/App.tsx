import { Route, Routes } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { DispatchPage } from '@/pages/dispatch-page'
import { NotFoundPage } from '@/pages/not-found-page'

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DispatchPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
