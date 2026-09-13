import { prisma } from '../src/db'

export const ids = {
  alice: '11111111-1111-4111-8111-111111111111',
  bob: '22222222-2222-4222-8222-222222222222',
  carol: '33333333-3333-4333-8333-333333333333',
  aliceAcJob: 'aaaaaaaa-0000-4000-8000-000000000001',
  aliceBreakerJob: 'aaaaaaaa-0000-4000-8000-000000000002',
  bobWaterHeaterJob: 'aaaaaaaa-0000-4000-8000-000000000003',
  unassignedDishwasherJob: 'aaaaaaaa-0000-4000-8000-000000000004',
  unassignedFaucetJob: 'aaaaaaaa-0000-4000-8000-000000000005',
  hvac: 'cccccccc-0000-4000-8000-000000000001',
  electrical: 'cccccccc-0000-4000-8000-000000000002',
  plumbing: 'cccccccc-0000-4000-8000-000000000003',
  applianceRepair: 'cccccccc-0000-4000-8000-000000000004',
  airConditioning: 'dddddddd-0000-4000-8000-000000000001',
  panelUpgrades: 'dddddddd-0000-4000-8000-000000000002',
  waterHeaters: 'dddddddd-0000-4000-8000-000000000003',
  dishwashers: 'dddddddd-0000-4000-8000-000000000004',
  fixturesAndFaucets: 'dddddddd-0000-4000-8000-000000000005',
} as const

const day = (n: number) => new Date(Date.UTC(2030, 0, n))

/** Wipes the test database and loads a small, known fixture. */
export async function resetDatabase() {
  await prisma.$transaction([
    prisma.job.deleteMany(),
    prisma.technicianSkill.deleteMany(),
    prisma.technician.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.skillCategory.deleteMany(),
    prisma.skillCategory.createMany({
      data: [
        { id: ids.hvac, name: 'HVAC' },
        { id: ids.electrical, name: 'Electrical' },
        { id: ids.plumbing, name: 'Plumbing' },
        { id: ids.applianceRepair, name: 'Appliance Repair' },
      ],
    }),
    prisma.skill.createMany({
      data: [
        { id: ids.airConditioning, name: 'Air Conditioning', categoryId: ids.hvac },
        { id: ids.panelUpgrades, name: 'Panel Upgrades', categoryId: ids.electrical },
        { id: ids.waterHeaters, name: 'Water Heaters', categoryId: ids.plumbing },
        { id: ids.dishwashers, name: 'Dishwashers', categoryId: ids.applianceRepair },
        { id: ids.fixturesAndFaucets, name: 'Fixtures & Faucets', categoryId: ids.plumbing },
      ],
    }),
    prisma.technician.createMany({
      data: [
        {
          id: ids.alice,
          name: 'Alice Nguyen',
          email: 'alice@test.example',
          phone: '(555) 010-0001',
          designation: 'Senior Technician',
          region: 'North',
        },
        {
          id: ids.bob,
          name: 'Bob Martinez',
          email: 'bob@test.example',
          phone: '(555) 010-0002',
          designation: 'Technician',
          region: 'South',
        },
        {
          id: ids.carol,
          name: 'Carol Smith',
          email: 'carol@test.example',
          phone: '(555) 010-0003',
          designation: 'Apprentice Technician',
          region: 'Central',
        },
      ],
    }),
    prisma.technicianSkill.createMany({
      data: [
        { technicianId: ids.alice, skillId: ids.airConditioning },
        { technicianId: ids.alice, skillId: ids.panelUpgrades },
        { technicianId: ids.bob, skillId: ids.waterHeaters },
        { technicianId: ids.carol, skillId: ids.dishwashers },
      ],
    }),
    prisma.job.createMany({
      data: [
        job(ids.aliceAcJob, 'AC unit not cooling', ids.airConditioning, day(3), ids.alice),
        job(ids.aliceBreakerJob, 'Breaker keeps tripping', ids.panelUpgrades, day(1), ids.alice),
        job(ids.bobWaterHeaterJob, 'Replace water heater', ids.waterHeaters, day(2), ids.bob),
        job(ids.unassignedDishwasherJob, 'Dishwasher not draining', ids.dishwashers, day(5), null),
        job(ids.unassignedFaucetJob, 'Leaking kitchen faucet', ids.fixturesAndFaucets, day(4), null),
      ],
    }),
  ])
}

function job(id: string, title: string, skillId: string, scheduledDate: Date, technicianId: string | null) {
  return {
    id,
    title,
    description: `${title} (test fixture)`,
    customerName: 'Test Customer',
    address: '1 Test Street, Testville',
    skillId,
    priority: 'MEDIUM' as const,
    scheduledDate,
    technicianId,
    assignedAt: technicianId ? new Date('2029-12-31T12:00:00Z') : null,
  }
}
