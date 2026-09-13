import { Fragment } from 'react'
import { ChevronRightIcon, MapPinIcon } from 'lucide-react'
import { formatLocation } from '@/lib/location'
import type { Location } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface LocationLabelProps {
  location: Location
  detail?: 'city' | 'full'
  className?: string
}

const rootClassName = 'inline-flex max-w-full min-w-0 items-center gap-1.5'
const iconClassName = 'size-3.5 shrink-0 text-muted-foreground'

export function LocationLabel({ location, detail = 'city', className }: LocationLabelProps) {
  if (detail === 'city') {
    return (
      <span data-slot="location-label" className={cn(rootClassName, className)}>
        <MapPinIcon aria-hidden="true" className={iconClassName} />
        {/* The region gives way first so the city stays readable in narrow cells. */}
        <span className="min-w-0 truncate">{location.city.name}</span>
        <span aria-hidden="true" className="shrink-0 text-muted-foreground">
          ·
        </span>
        <span className="min-w-0 shrink-[3] truncate text-muted-foreground">{location.region.name}</span>
      </span>
    )
  }

  const trail = [
    { key: 'province', name: location.province.name, className: 'shrink-[3] text-muted-foreground' },
    { key: 'region', name: location.region.name, className: 'shrink-[2] text-muted-foreground' },
    { key: 'city', name: location.city.name, className: '' },
  ]

  return (
    // role="img" lets the trail be announced once, as "Surrey, Metro Vancouver, BC", instead of as fragments.
    <span
      data-slot="location-label"
      role="img"
      aria-label={formatLocation(location, 'full')}
      className={cn(rootClassName, className)}
    >
      <MapPinIcon aria-hidden="true" className={iconClassName} />
      {trail.map((part, index) => (
        <Fragment key={part.key}>
          {index > 0 && <ChevronRightIcon aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />}
          <span className={cn('min-w-0 truncate', part.className)}>{part.name}</span>
        </Fragment>
      ))}
    </span>
  )
}
