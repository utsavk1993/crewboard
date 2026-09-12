import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

describe('Sheet', () => {
  it('uses its title as the accessible name and closes from the Close button', async () => {
    const user = userEvent.setup()
    render(
      <Sheet>
        <SheetTrigger asChild>
          <Button>View technician</Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Dana Whitfield</SheetTitle>
            <SheetDescription>Assigned jobs and workload.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    )

    await user.click(screen.getByRole('button', { name: 'View technician' }))

    const sheet = screen.getByRole('dialog', { name: 'Dana Whitfield' })
    expect(sheet).toHaveAccessibleDescription('Assigned jobs and workload.')
    expect(sheet).toHaveAttribute('data-side', 'left')

    await user.click(within(sheet).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
