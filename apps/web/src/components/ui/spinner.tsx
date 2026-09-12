import type { ComponentProps } from 'react'
import { Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className, ...props }: ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      // Reduced motion slows the spin rather than stopping it, so loading never looks frozen.
      className={cn('size-4 animate-spin motion-reduce:[animation-duration:2.5s]', className)}
      {...props}
    />
  )
}
