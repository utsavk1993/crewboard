import { getWorkloadLevel, WORKLOAD_CAPACITY, workloadLabels, type WorkloadLevel } from '@/lib/workload'
import { cn } from '@/lib/utils'

const fillClasses: Record<WorkloadLevel, string> = {
  available: 'bg-muted-foreground/40',
  light: 'bg-success',
  steady: 'bg-warning',
  heavy: 'bg-destructive',
}

interface WorkloadMeterProps {
  count: number
  name?: string
  showLabel?: boolean
  className?: string
}

export function WorkloadMeter({ count, name, showLabel = true, className }: WorkloadMeterProps) {
  const level = getWorkloadLevel(count)
  const label = workloadLabels[level]
  const value = Math.min(count, WORKLOAD_CAPACITY)

  return (
    <div
      role="meter"
      aria-label={name ? `${name} workload` : 'Workload'}
      aria-valuemin={0}
      aria-valuemax={WORKLOAD_CAPACITY}
      aria-valuenow={value}
      // The raw count, not the clamped value, so assistive tech hears "8 jobs" rather than a full meter.
      aria-valuetext={`${count} ${count === 1 ? 'job' : 'jobs'}, ${label}`}
      data-level={level}
      className={cn('flex items-center gap-2.5', className)}
    >
      <span aria-hidden="true" className="min-w-[2ch] text-right text-sm font-medium tabular-nums">
        {count}
      </span>
      {/* Shorter on phones, where the bar shares a narrow table row with the count and the row actions. */}
      <div aria-hidden="true" className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-muted sm:w-16">
        <div
          data-slot="workload-meter-fill"
          className={cn(
            'h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none',
            fillClasses[level],
          )}
          style={{ width: `${(value / WORKLOAD_CAPACITY) * 100}%` }}
        />
      </div>
      {showLabel && (
        <span aria-hidden="true" className="text-xs text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  )
}
