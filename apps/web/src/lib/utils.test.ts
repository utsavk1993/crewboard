import { cn } from '@/lib/utils'

describe('cn', () => {
  it('lets later classes override conflicting earlier ones', () => {
    expect(cn('px-2 text-muted-foreground', 'px-4', false && 'hidden')).toBe('text-muted-foreground px-4')
  })

  it('keeps a semantic text color alongside a font size', () => {
    expect(cn('text-sm text-muted-foreground', 'text-success')).toBe('text-sm text-success')
  })
})
