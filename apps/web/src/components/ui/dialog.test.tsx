import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

function AssignJobExample() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Assign job</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose a job</DialogTitle>
          <DialogDescription>Pick an unassigned job for this technician.</DialogDescription>
        </DialogHeader>
        <Input aria-label="Job ID" />
        <DialogFooter>
          <Button>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('opens from its trigger, moves focus inside, and closes on Escape returning focus', async () => {
    const user = userEvent.setup()
    render(<AssignJobExample />)

    const trigger = screen.getByRole('button', { name: 'Assign job' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Choose a job' })
    expect(dialog).toHaveAccessibleDescription('Pick an unassigned job for this technician.')
    expect(screen.getByRole('textbox', { name: 'Job ID' })).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('keeps keyboard focus inside while open', async () => {
    const user = userEvent.setup()
    render(<AssignJobExample />)

    await user.click(screen.getByRole('button', { name: 'Assign job' }))

    const input = screen.getByRole('textbox', { name: 'Job ID' })
    const close = screen.getByRole('button', { name: 'Close' })

    await user.tab()
    expect(screen.getByRole('button', { name: 'Assign' })).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab()
    expect(input).toHaveFocus()
    await user.tab({ shift: true })
    expect(close).toHaveFocus()
  })

  it('closes from the labelled close button', async () => {
    const user = userEvent.setup()
    render(<AssignJobExample />)

    await user.click(screen.getByRole('button', { name: 'Assign job' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
