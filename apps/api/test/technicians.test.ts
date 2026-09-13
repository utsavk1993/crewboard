import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/db'
import { ids } from './fixtures'

const app = createApp()

const metroVancouver = (city: { id: string; name: string }) => ({
  city,
  region: { id: ids.metroVancouver, name: 'Metro Vancouver' },
  province: { code: 'BC', name: 'British Columbia' },
})

describe('GET /api/technicians', () => {
  it('lists technicians sorted by name with their specialties and assigned job count', async () => {
    const res = await request(app).get('/api/technicians')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      {
        id: ids.alice,
        name: 'Alice Nguyen',
        email: 'alice@test.example',
        phone: '(555) 010-0001',
        designation: 'Senior Technician',
        region: 'Surrey',
        location: metroVancouver({ id: ids.surrey, name: 'Surrey' }),
        skills: ['Panel Upgrades', 'Air Conditioning'],
        specialties: [
          { id: ids.panelUpgrades, name: 'Panel Upgrades', category: { id: ids.electrical, name: 'Electrical' } },
          { id: ids.airConditioning, name: 'Air Conditioning', category: { id: ids.hvac, name: 'HVAC' } },
        ],
        assignedJobCount: 2,
      },
      expect.objectContaining({ id: ids.bob, name: 'Bob Martinez', skills: ['Water Heaters'], assignedJobCount: 1 }),
      expect.objectContaining({ id: ids.carol, name: 'Carol Smith', skills: ['Dishwashers'], assignedJobCount: 0 }),
    ])
  })

  it("includes each technician's home base location, with the city name as the legacy region", async () => {
    const res = await request(app).get('/api/technicians')

    expect(
      Object.fromEntries(res.body.map((technician: { id: string; region: string; location: unknown }) => [technician.id, [technician.region, technician.location]])),
    ).toEqual({
      [ids.alice]: ['Surrey', metroVancouver({ id: ids.surrey, name: 'Surrey' })],
      [ids.bob]: ['Langley', metroVancouver({ id: ids.langley, name: 'Langley' })],
      [ids.carol]: [
        'Kelowna',
        {
          city: { id: ids.kelowna, name: 'Kelowna' },
          region: { id: ids.centralOkanagan, name: 'Central Okanagan' },
          province: { code: 'BC', name: 'British Columbia' },
        },
      ],
    })
  })

  it('sorts specialties by category name, then specialty name', async () => {
    // Added after Water Heaters, so insertion order alone would list it last.
    await prisma.technicianSkill.create({ data: { technicianId: ids.bob, skillId: ids.fixturesAndFaucets } })
    await prisma.technicianSkill.create({ data: { technicianId: ids.bob, skillId: ids.dishwashers } })

    const res = await request(app).get('/api/technicians')
    const bob = res.body.find((technician: { id: string }) => technician.id === ids.bob)

    expect(bob.specialties.map((specialty: { category: { name: string }; name: string }) => [specialty.category.name, specialty.name])).toEqual([
      ['Appliance Repair', 'Dishwashers'],
      ['Plumbing', 'Fixtures & Faucets'],
      ['Plumbing', 'Water Heaters'],
    ])
    expect(bob.skills).toEqual(['Dishwashers', 'Fixtures & Faucets', 'Water Heaters'])
  })

  it('returns an empty list of specialties for a technician without any', async () => {
    await prisma.technicianSkill.deleteMany({ where: { technicianId: ids.carol } })

    const res = await request(app).get('/api/technicians')

    expect(res.body.find((technician: { id: string }) => technician.id === ids.carol)).toMatchObject({
      skills: [],
      specialties: [],
    })
  })
})
