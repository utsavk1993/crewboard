import { useEffect, useState } from 'react'
import { SparklesIcon } from 'lucide-react'
import { AssistantPanel } from '@/components/assistant/assistant-panel'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

function shortcutLabel() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘J' : 'Ctrl+J'
}

export function AssistantButton() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // `key` is compared directly: some synthetic keydown events (browser autofill) carry no key at all.
      if (event.key !== 'j' && event.key !== 'J') return
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.isComposing) return
      event.preventDefault()
      setOpen((current) => !current)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label="Open assistant"
            aria-keyshortcuts="Meta+J Control+J"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            // Square icon-only button below sm, where the label is hidden.
            className="max-sm:has-[>svg]:px-[7px]"
          >
            <SparklesIcon aria-hidden="true" />
            <span className="hidden sm:inline">Assistant</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Assistant ({shortcutLabel()})</TooltipContent>
      </Tooltip>
      <AssistantPanel open={open} onOpenChange={setOpen} />
    </>
  )
}
