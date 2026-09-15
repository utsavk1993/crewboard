import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/db'
import { ids } from './fixtures'

const app = createApp()

describe('GET /api/skills', () => {
  it('returns every category with its specialties, both sorted by name', async () => {
    const res = await request(app).get('/api/skills')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      categories: [
        { id: ids.applianceRepair, name: 'Appliance Repair', specialties: [{ id: ids.dishwashers, name: 'Dishwashers' }] },
        { id: ids.electrical, name: 'Electrical', specialties: [{ id: ids.panelUpgrades, name: 'Panel Upgrades' }] },
        { id: ids.hvac, name: 'HVAC', specialties: [{ id: ids.airConditioning, name: 'Air Conditioning' }] },
        {
          id: ids.plumbing,
          name: 'Plumbing',
          specialties: [
            { id: ids.fixturesAndFaucets, name: 'Fixtures & Faucets' },
            { id: ids.waterHeaters, name: 'Water Heaters' },
          ],
        },
      ],
    })
  })

  it('sorts a specialty added last into place by name', async () => {
    // Inserted after Water Heaters, so insertion order alone would list it last.
    const backflow = await prisma.skill.create({
      data: { name: 'Backflow Prevention', categoryId: ids.plumbing },
      select: { id: true, name: true },
    })

    const res = await request(app).get('/api/skills')
    const plumbing = res.body.categories.find((category: { id: string }) => category.id === ids.plumbing)

    expect(plumbing.specialties).toEqual([
      { id: backflow.id, name: 'Backflow Prevention' },
      { id: ids.fixturesAndFaucets, name: 'Fixtures & Faucets' },
      { id: ids.waterHeaters, name: 'Water Heaters' },
    ])
  })

  it('includes a category that has no specialties yet', async () => {
    const category = await prisma.skillCategory.create({ data: { name: 'Roofing' }, select: { id: true } })

    const res = await request(app).get('/api/skills')

    expect(res.body.categories.at(-1)).toEqual({ id: category.id, name: 'Roofing', specialties: [] })
  })

  it('returns an empty list when the taxonomy is empty', async () => {
    await prisma.job.deleteMany()
    await prisma.technicianSkill.deleteMany()
    await prisma.skill.deleteMany()
    await prisma.skillCategory.deleteMany()

    const res = await request(app).get('/api/skills')

    expect(res.body).toEqual({ categories: [] })
  })
})
