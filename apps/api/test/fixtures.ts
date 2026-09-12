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
} as const

const day = (n: number) => new Date(Date.UTC(2030, 0, n))

/** Wipes the test database and loads a small, known fixture. */
export async function resetDatabase() {
  await prisma.$transaction([
    prisma.job.deleteMany(),
    prisma.technician.deleteMany(),
    prisma.technician.createMany({
      data: [
        {
          id: ids.alice,
          name: 'Alice Nguyen',
          email: 'alice@test.example',
          phone: '(555) 010-0001',
          designation: 'Senior Technician',
          region: 'North',
          skills: ['HVAC', 'Electrical'],
        },
        {
          id: ids.bob,
          name: 'Bob Martinez',
          email: 'bob@test.example',
          phone: '(555) 010-0002',
          designation: 'Technician',
          region: 'South',
          skills: ['Plumbing'],
        },
        {
          id: ids.carol,
          name: 'Carol Smith',
          email: 'carol@test.example',
          phone: '(555) 010-0003',
          designation: 'Apprentice Technician',
          region: 'Central',
          skills: ['Appliance Repair'],
        },
      ],
    }),
    prisma.job.createMany({
      data: [
        job(ids.aliceAcJob, 'AC unit not cooling', 'HVAC', day(3), ids.alice),
        job(ids.aliceBreakerJob, 'Breaker keeps tripping', 'Electrical', day(1), ids.alice),
        job(ids.bobWaterHeaterJob, 'Replace water heater', 'Plumbing', day(2), ids.bob),
        job(ids.unassignedDishwasherJob, 'Dishwasher not draining', 'Appliance Repair', day(5), null),
        job(ids.unassignedFaucetJob, 'Leaking kitchen faucet', 'Plumbing', day(4), null),
      ],
    }),
  ])
}

function job(id: string, title: string, requiredSkill: string, scheduledDate: Date, technicianId: string | null) {
  return {
    id,
    title,
    description: `${title} (test fixture)`,
    customerName: 'Test Customer',
    address: '1 Test Street, Testville',
    requiredSkill,
    priority: 'MEDIUM' as const,
    scheduledDate,
    technicianId,
    assignedAt: technicianId ? new Date('2029-12-31T12:00:00Z') : null,
  }
}
