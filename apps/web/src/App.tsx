import { AppHeader } from '@/components/layout/app-header'

export function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dispatch board</h1>
          <p className="text-sm text-muted-foreground">See who's available, balance workloads, and assign open jobs.</p>
        </div>
      </main>
    </div>
  )
}
