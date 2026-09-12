import { WrenchIcon } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Separator } from '@/components/ui/separator'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <WrenchIcon className="size-4" aria-hidden />
          </div>
          <span className="truncate font-semibold tracking-tight">Crewboard</span>
          <Separator orientation="vertical" className="hidden min-[360px]:block data-[orientation=vertical]:h-4" />
          <span className="hidden text-sm text-muted-foreground min-[360px]:inline">Dispatch</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
