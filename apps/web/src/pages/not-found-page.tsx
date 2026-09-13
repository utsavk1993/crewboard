import { ArrowLeftIcon, CompassIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useDocumentTitle } from '@/lib/use-document-title'

export function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border bg-muted text-muted-foreground">
        <CompassIcon className="size-6" aria-hidden />
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm text-muted-foreground">This page doesn't exist or may have moved.</p>
      </div>
      <Button asChild>
        <Link to="/">
          <ArrowLeftIcon aria-hidden />
          Back to dispatch board
        </Link>
      </Button>
    </div>
  )
}
