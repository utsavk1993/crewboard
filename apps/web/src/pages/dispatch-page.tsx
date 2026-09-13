import { DispatchBoard } from '@/components/dashboard/dispatch-board'
import { useDocumentTitle } from '@/lib/use-document-title'

export function DispatchPage() {
  useDocumentTitle('Dispatch board')

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dispatch board</h1>
        <p className="text-sm text-muted-foreground">See who's available, balance workloads, and assign open jobs.</p>
      </div>
      <DispatchBoard />
    </>
  )
}
