import type { CSSProperties } from 'react'
import { CircleCheckIcon, InfoIcon, LoaderCircleIcon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '@/components/theme/theme-provider'

// Sonner injects unlayered CSS, which beats Tailwind's layered utilities, so theming goes through its
// CSS variables and inline style rather than utility classes.
const tokenStyle = {
  '--normal-bg': 'var(--popover)',
  '--normal-text': 'var(--popover-foreground)',
  '--normal-border': 'var(--border)',
  '--border-radius': 'var(--radius)',
  fontFamily: 'inherit',
} as CSSProperties

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      position="bottom-right"
      closeButton
      richColors={false}
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-info" />,
        warning: <TriangleAlertIcon className="size-4 text-warning" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" />,
      }}
      style={tokenStyle}
      {...props}
    />
  )
}
