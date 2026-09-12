import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function ViewMenuExample({ onSortChange }: { onSortChange: (value: string) => void }) {
  const [sort, setSort] = useState('name')
  const [showOffShift, setShowOffShift] = useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">View</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sort}
          onValueChange={(value) => {
            setSort(value)
            onSortChange(value)
          }}
        >
          <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="workload">Workload</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={showOffShift} onCheckedChange={setShowOffShift}>
          Show off-shift
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

describe('DropdownMenu', () => {
  it('opens and selects a radio item with the keyboard', async () => {
    const user = userEvent.setup()
    const onSortChange = jest.fn()
    render(<ViewMenuExample onSortChange={onSortChange} />)

    const trigger = screen.getByRole('button', { name: 'View' })
    trigger.focus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute('aria-checked', 'true')
    await waitFor(() => expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveFocus())

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitemradio', { name: 'Workload' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onSortChange).toHaveBeenCalledWith('workload')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())

    await user.keyboard('{Enter}')
    expect(screen.getByRole('menuitemradio', { name: 'Workload' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute('aria-checked', 'false')
  })

  it('toggles a checkbox item with the pointer', async () => {
    const user = userEvent.setup()
    render(<ViewMenuExample onSortChange={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'View' }))
    const item = screen.getByRole('menuitemcheckbox', { name: 'Show off-shift' })
    expect(item).toHaveAttribute('aria-checked', 'false')

    await user.click(item)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('menuitemcheckbox', { name: 'Show off-shift' })).toHaveAttribute('aria-checked', 'true')
  })
})
