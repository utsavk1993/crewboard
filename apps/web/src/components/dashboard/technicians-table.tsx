import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type CellData,
  type Column,
  type FilterFn,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, SearchX, Users, type LucideIcon } from 'lucide-react'
import { TechnicianAvatar } from '@/components/dashboard/technician-avatar'
import { WorkloadMeter } from '@/components/dashboard/workload-meter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { groupSpecialties, type SpecialtyGroup } from '@/lib/skills'
import { matchesTechnicianSearch } from '@/lib/technician-search'
import type { Location, Specialty, Technician } from '@/lib/types'
import { cn } from '@/lib/utils'

export type TechniciansTableProps = {
  technicians: Technician[]
  loading: boolean
  onAssign: (technician: Technician) => void
  onViewJobs: (technician: Technician) => void
}

// Classes shared by a column's header and cells, so responsive hiding and widths stay in step.
interface ColumnLayout {
  className?: string
}

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  columnMeta: {} as ColumnLayout,
})

type Features = typeof features

const MAX_VISIBLE_CATEGORIES = 2
const SKELETON_ROW_COUNT = 6

const compareNames = (a: Technician, b: Technician) => a.name.localeCompare(b.name)

// Matches the whole technician rather than one cell, so email, every specialty and the full location
// are searchable even though they aren't all shown.
const matchesSearch: FilterFn<Features, Technician> = (row, _columnId, term: string) =>
  matchesTechnicianSearch(row.original, term)

function pluralizeTechnicians(count: number) {
  return count === 1 ? 'technician' : 'technicians'
}

function ariaSort(sorted: false | 'asc' | 'desc') {
  if (sorted === 'asc') return 'ascending'
  if (sorted === 'desc') return 'descending'
  return 'none'
}

function SortableHeader<TValue extends CellData>({
  column,
  children,
}: {
  column: Column<Features, Technician, TValue>
  children: ReactNode
}) {
  const sorted = column.getIsSorted()
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={column.getToggleSortingHandler()}
      className="-ml-2.5 h-7 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      {children}
      <Icon aria-hidden="true" className={cn('size-3.5', !sorted && 'opacity-60')} />
    </Button>
  )
}

function TechnicianCell({ technician }: { technician: Technician }) {
  return (
    <div className="flex items-center gap-3">
      <TechnicianAvatar name={technician.name} />
      <div className="min-w-0 max-w-56">
        <p className="truncate font-medium">{technician.name}</p>
        <p className="truncate text-xs text-muted-foreground">{technician.email}</p>
      </div>
    </div>
  )
}

const specialtyNames = (group: SpecialtyGroup) => group.specialties.map((specialty) => specialty.name).join(', ')

// The accessible name starts with the visible label and carries the tooltip's text, so screen reader
// users get the details without opening it.
function BadgeWithTooltip({
  label,
  accessibleName,
  children,
}: {
  label: string
  accessibleName: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* A button so keyboard users can focus it to reveal the tooltip. */}
        <Badge
          asChild
          variant="outline"
          className="font-normal text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <button type="button" aria-label={accessibleName}>
            {label}
          </button>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  )
}

function SkillCategories({ specialties }: { specialties: Specialty[] }) {
  const groups = groupSpecialties(specialties)
  const visible = groups.slice(0, MAX_VISIBLE_CATEGORIES)
  const overflow = groups.slice(MAX_VISIBLE_CATEGORIES)

  if (groups.length === 0) {
    return <span className="text-xs text-muted-foreground">No skills listed</span>
  }

  return (
    <div className="flex items-center gap-1">
      {visible.map((group) => (
        <BadgeWithTooltip
          key={group.category.id}
          label={group.category.name}
          accessibleName={`${group.category.name}: ${specialtyNames(group)}`}
        >
          {specialtyNames(group)}
        </BadgeWithTooltip>
      ))}
      {overflow.length > 0 && (
        <BadgeWithTooltip
          label={`+${overflow.length}`}
          accessibleName={`+${overflow.length} more ${overflow.length === 1 ? 'category' : 'categories'}: ${overflow
            .map((group) => `${group.category.name}: ${specialtyNames(group)}`)
            .join('; ')}`}
        >
          <div className="flex flex-col gap-1.5">
            {overflow.map((group) => (
              <div key={group.category.id}>
                <div className="font-medium">{group.category.name}</div>
                <div className="text-muted-foreground">{specialtyNames(group)}</div>
              </div>
            ))}
          </div>
        </BadgeWithTooltip>
      )}
    </div>
  )
}

function LocationCell({ location }: { location: Location }) {
  return (
    <div className="flex flex-col whitespace-nowrap">
      <span className="text-sm">{location.city.name}</span>
      <span className="text-xs text-muted-foreground">{location.region.name}</span>
    </div>
  )
}

const columnHelper = createColumnHelper<Features, Technician>()

function buildColumns(
  onAssign: TechniciansTableProps['onAssign'],
  onViewJobs: TechniciansTableProps['onViewJobs'],
) {
  return columnHelper.columns([
    columnHelper.accessor('name', {
      header: ({ column }) => <SortableHeader column={column}>Technician</SortableHeader>,
      cell: ({ row }) => <TechnicianCell technician={row.original} />,
      sortFn: (rowA, rowB) => compareNames(rowA.original, rowB.original),
      meta: { className: 'min-w-56' },
    }),
    columnHelper.accessor('designation', {
      header: 'Role',
      enableSorting: false,
      cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue()}</span>,
      meta: { className: 'hidden md:table-cell' },
    }),
    columnHelper.accessor('specialties', {
      header: 'Skills',
      enableSorting: false,
      cell: ({ getValue }) => <SkillCategories specialties={getValue()} />,
      meta: { className: 'hidden sm:table-cell' },
    }),
    columnHelper.accessor('location', {
      header: 'Location',
      enableSorting: false,
      cell: ({ getValue }) => <LocationCell location={getValue()} />,
      meta: { className: 'hidden lg:table-cell' },
    }),
    columnHelper.accessor('assignedJobCount', {
      header: ({ column }) => <SortableHeader column={column}>Workload</SortableHeader>,
      cell: ({ row }) => <WorkloadMeter count={row.original.assignedJobCount} name={row.original.name} />,
      // Dispatchers look for the busiest technicians first.
      sortDescFirst: true,
      sortFn: (rowA, rowB) => rowA.original.assignedJobCount - rowB.original.assignedJobCount,
      meta: { className: 'w-40' },
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" onClick={() => onAssign(row.original)}>
            <Plus aria-hidden="true" />
            Assign job<span className="sr-only"> to {row.original.name}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onViewJobs(row.original)}>
            View jobs<span className="sr-only"> for {row.original.name}</span>
          </Button>
        </div>
      ),
      meta: { className: 'text-right' },
    }),
  ])
}

// Shapes that echo each column's content, so rows don't jump when data arrives.
const skeletonCells: Record<string, ReactNode> = {
  name: (
    <div className="flex items-center gap-3">
      <Skeleton className="size-8 rounded-full" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  ),
  designation: <Skeleton className="h-3.5 w-28" />,
  specialties: (
    <div className="flex gap-1">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-5 w-20" />
    </div>
  ),
  location: (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-3 w-28" />
    </div>
  ),
  assignedJobCount: <Skeleton className="h-3.5 w-28" />,
  actions: (
    <div className="flex justify-end gap-1">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-20" />
    </div>
  ),
}

function StateMessage({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-1 py-10 text-center">
      <span
        aria-hidden="true"
        className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <Icon className="size-5" />
      </span>
      <p className="font-medium break-words">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  )
}

export function TechniciansTable({ technicians, loading, onAssign, onViewJobs }: TechniciansTableProps) {
  const [search, setSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const term = search.trim()

  const columns = useMemo(() => buildColumns(onAssign, onViewJobs), [onAssign, onViewJobs])
  // Sorting falls back to input order on ties, so ordering by name here breaks workload ties by name
  // in both directions.
  const data = useMemo(() => [...technicians].sort(compareNames), [technicians])

  const table = useTable({
    features,
    columns,
    data,
    initialState: { sorting: [{ id: 'name', desc: false }] },
    state: { globalFilter: term },
    globalFilterFn: matchesSearch,
    // matchesSearch reads the whole row, so running it for a single column is enough.
    getColumnCanGlobalFilter: (column) => column.id === 'name',
    enableMultiSort: false,
    enableSortingRemoval: false,
  })

  const rows = table.getRowModel().rows
  const leafColumns = table.getAllLeafColumns()
  const total = technicians.length
  const countLabel =
    rows.length === total
      ? `${total} ${pluralizeTechnicians(total)}`
      : `${rows.length} of ${total} ${pluralizeTechnicians(total)}`

  function clearSearch() {
    setSearch('')
    searchInputRef.current?.focus()
  }

  function renderBody() {
    if (loading) {
      return Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <TableRow key={index} aria-hidden="true" className="h-16 hover:bg-transparent">
          {leafColumns.map((column) => (
            <TableCell key={column.id} className={column.columnDef.meta?.className}>
              {skeletonCells[column.id]}
            </TableCell>
          ))}
        </TableRow>
      ))
    }

    if (total === 0 || rows.length === 0) {
      return (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={leafColumns.length}>
            {total === 0 ? (
              <StateMessage
                icon={Users}
                title="No technicians yet"
                description="Technicians appear here once they're added to your crew."
              />
            ) : (
              <StateMessage
                icon={SearchX}
                title={`No technicians match “${term}”`}
                description="Try a different name, skill or city."
              >
                <Button variant="ghost" size="sm" className="mt-2" onClick={clearSearch}>
                  Clear search
                </Button>
              </StateMessage>
            )}
          </TableCell>
        </TableRow>
      )
    }

    return rows.map((row) => (
      <TableRow key={row.id} className="h-16">
        {row.getAllCells().map((cell) => (
          <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
            <table.FlexRender cell={cell} />
          </TableCell>
        ))}
      </TableRow>
    ))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={searchInputRef}
            type="search"
            aria-label="Search technicians"
            placeholder="Search name, skill, city…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
          {loading ? '' : countLabel}
        </p>
      </div>
      <Table aria-label="Technicians" aria-busy={loading || undefined}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  aria-sort={header.column.getCanSort() ? ariaSort(header.column.getIsSorted()) : undefined}
                  className={header.column.columnDef.meta?.className}
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>{renderBody()}</TableBody>
      </Table>
    </div>
  )
}
