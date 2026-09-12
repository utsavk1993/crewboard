import { render, screen } from '@testing-library/react'
import { WorkloadMeter } from '@/components/dashboard/workload-meter'

describe('WorkloadMeter', () => {
  it('exposes the count and level as an accessible meter named after the technician', () => {
    render(<WorkloadMeter count={3} name="Ana Lima" />)

    const meter = screen.getByRole('meter', { name: 'Ana Lima workload' })
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '6')
    expect(meter).toHaveAttribute('aria-valuenow', '3')
    expect(meter).toHaveAttribute('aria-valuetext', '3 jobs, Steady')
  })

  it('falls back to a generic name without a technician name', () => {
    render(<WorkloadMeter count={2} />)

    expect(screen.getByRole('meter', { name: 'Workload' })).toBeInTheDocument()
  })

  it('clamps the value at capacity but keeps the real count in the value text', () => {
    render(<WorkloadMeter count={9} name="Ana Lima" />)

    const meter = screen.getByRole('meter', { name: 'Ana Lima workload' })
    expect(meter).toHaveAttribute('aria-valuenow', '6')
    expect(meter).toHaveAttribute('aria-valuetext', '9 jobs, Heavy')
    expect(meter.querySelector('[data-slot="workload-meter-fill"]')).toHaveStyle({ width: '100%' })
  })

  it.each([
    [0, '0 jobs, Available', '0%'],
    [1, '1 job, Light', `${(1 / 6) * 100}%`],
    [5, '5 jobs, Heavy', `${(5 / 6) * 100}%`],
  ])('describes %i jobs as "%s"', (count, valueText, width) => {
    render(<WorkloadMeter count={count} />)

    const meter = screen.getByRole('meter', { name: 'Workload' })
    expect(meter).toHaveAttribute('aria-valuetext', valueText)
    expect(meter.querySelector('[data-slot="workload-meter-fill"]')).toHaveStyle({ width })
  })

  it('shows the count and level label by default', () => {
    render(<WorkloadMeter count={4} />)

    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Steady')).toBeInTheDocument()
  })

  it('hides the level label when showLabel is false', () => {
    render(<WorkloadMeter count={4} showLabel={false} />)

    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.queryByText('Steady')).not.toBeInTheDocument()
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', '4 jobs, Steady')
  })
})
