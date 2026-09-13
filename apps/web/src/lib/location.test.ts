import { formatLocation, proximity } from '@/lib/location'
import { makeLocation } from '@/test/factories'

const alberta = { code: 'AB', name: 'Alberta' }

const surrey = makeLocation('Surrey')
const burnaby = makeLocation('Burnaby')
const kelowna = makeLocation('Kelowna', 'Okanagan')
const calgary = makeLocation('Calgary', 'Calgary Region', alberta)

describe('formatLocation', () => {
  it('shows the city by default', () => {
    expect(formatLocation(surrey)).toBe('Surrey')
    expect(formatLocation(surrey, 'city')).toBe('Surrey')
  })

  it('shows the city, region and province code in full', () => {
    expect(formatLocation(surrey, 'full')).toBe('Surrey, Metro Vancouver, BC')
    expect(formatLocation(calgary, 'full')).toBe('Calgary, Calgary Region, AB')
  })
})

describe('proximity', () => {
  it.each([
    ['the same city', surrey, makeLocation('Surrey'), 'city'],
    ['cities in the same region', surrey, burnaby, 'region'],
    ['regions in the same province', surrey, kelowna, 'province'],
    ['different provinces', surrey, calgary, null],
  ] as const)('is %s-level for %s', (_, a, b, expected) => {
    expect(proximity(a, b)).toBe(expected)
    expect(proximity(b, a)).toBe(expected)
  })

  it('compares by id, so same-named places in different regions are not the same city', () => {
    const otherSurrey = { ...kelowna, city: { id: 'city-surrey-okanagan', name: 'Surrey' } }

    expect(proximity(surrey, otherSurrey)).toBe('province')
  })

  it('compares provinces by code', () => {
    expect(proximity(surrey, { ...surrey, province: { code: 'BC', name: 'B.C.' } })).toBe('city')
  })
})
