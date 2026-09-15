import { prisma } from '../src/db'
import { recomputeActiveJobCounts } from '../src/workload-counter'

export const ids = {
  alice: '11111111-1111-4111-8111-111111111111',
  bob: '22222222-2222-4222-8222-222222222222',
  carol: '33333333-3333-4333-8333-333333333333',
  aliceAcJob: 'aaaaaaaa-0000-4000-8000-000000000001',
  aliceBreakerJob: 'aaaaaaaa-0000-4000-8000-000000000002',
  bobWaterHeaterJob: 'aaaaaaaa-0000-4000-8000-000000000003',
  unassignedDishwasherJob: 'aaaaaaaa-0000-4000-8000-000000000004',
  unassignedFaucetJob: 'aaaaaaaa-0000-4000-8000-000000000005',
  aliceCompletedJob: 'aaaaaaaa-0000-4000-8000-000000000006',
  cancelledJob: 'aaaaaaaa-0000-4000-8000-000000000007',
  hvac: 'cccccccc-0000-4000-8000-000000000001',
  electrical: 'cccccccc-0000-4000-8000-000000000002',
  plumbing: 'cccccccc-0000-4000-8000-000000000003',
  applianceRepair: 'cccccccc-0000-4000-8000-000000000004',
  airConditioning: 'dddddddd-0000-4000-8000-000000000001',
  panelUpgrades: 'dddddddd-0000-4000-8000-000000000002',
  waterHeaters: 'dddddddd-0000-4000-8000-000000000003',
  dishwashers: 'dddddddd-0000-4000-8000-000000000004',
  fixturesAndFaucets: 'dddddddd-0000-4000-8000-000000000005',
  metroVancouver: 'eeeeeeee-0000-4000-8000-000000000001',
  centralOkanagan: 'eeeeeeee-0000-4000-8000-000000000002',
  surrey: 'ffffffff-0000-4000-8000-000000000001',
  burnaby: 'ffffffff-0000-4000-8000-000000000002',
  langley: 'ffffffff-0000-4000-8000-000000000003',
  mapleRidge: 'ffffffff-0000-4000-8000-000000000004',
  kelowna: 'ffffffff-0000-4000-8000-000000000005',
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
    prisma.city.deleteMany(),
    prisma.region.deleteMany(),
    prisma.province.deleteMany(),
    prisma.province.createMany({ data: [{ code: 'BC', name: 'British Columbia' }] }),
    prisma.region.createMany({
      data: [
        { id: ids.metroVancouver, name: 'Metro Vancouver', provinceCode: 'BC' },
        { id: ids.centralOkanagan, name: 'Central Okanagan', provinceCode: 'BC' },
      ],
    }),
    prisma.city.createMany({
      data: [
        { id: ids.surrey, name: 'Surrey', regionId: ids.metroVancouver },
        { id: ids.burnaby, name: 'Burnaby', regionId: ids.metroVancouver },
        { id: ids.langley, name: 'Langley', regionId: ids.metroVancouver },
        { id: ids.mapleRidge, name: 'Maple Ridge', regionId: ids.metroVancouver },
        { id: ids.kelowna, name: 'Kelowna', regionId: ids.centralOkanagan },
      ],
    }),
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
          cityId: ids.surrey,
          hiredOn: new Date('2016-03-14'),
        },
        {
          id: ids.bob,
          name: 'Bob Martinez',
          email: 'bob@test.example',
          phone: '(555) 010-0002',
          designation: 'Technician',
          cityId: ids.langley,
          hiredOn: new Date('2021-09-07'),
        },
        {
          id: ids.carol,
          name: 'Carol Smith',
          email: 'carol@test.example',
          phone: '(555) 010-0003',
          designation: 'Apprentice Technician',
          cityId: ids.kelowna,
          hiredOn: new Date('2025-06-02'),
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
        job(ids.aliceAcJob, 'AC unit not cooling', ids.airConditioning, day(3), ids.alice, ids.surrey, '12345 72 Ave, Surrey, BC V3W 2M9'),
        job(ids.aliceBreakerJob, 'Breaker keeps tripping', ids.panelUpgrades, day(1), ids.alice, ids.burnaby, '4500 Kingsway, Burnaby, BC V5H 2A9'),
        job(ids.bobWaterHeaterJob, 'Replace water heater', ids.waterHeaters, day(2), ids.bob, ids.langley, '20150 56 Ave, Langley, BC V3A 3Y6'),
        job(ids.unassignedDishwasherJob, 'Dishwasher not draining', ids.dishwashers, day(5), null, ids.kelowna, '1560 Bernard Ave, Kelowna, BC V1Y 6R5'),
        job(ids.unassignedFaucetJob, 'Leaking kitchen faucet', ids.fixturesAndFaucets, day(4), null, ids.mapleRidge, '22710 Dewdney Trunk Rd, Maple Ridge, BC V2X 3K4'),
        // History: closed jobs that stay out of lists and workload counts.
        {
          ...job(ids.aliceCompletedJob, 'AC condensate leak', ids.airConditioning, day(-10), ids.alice, ids.surrey, '7350 152 St, Surrey, BC V3S 3L2'),
          status: 'COMPLETED',
          assignedAt: new Date('2029-12-18T17:00:00Z'),
          completedAt: new Date('2029-12-21T22:30:00Z'),
        },
        {
          ...job(ids.cancelledJob, 'No hot water', ids.waterHeaters, day(-5), null, ids.langley, '19900 Fraser Hwy, Langley, BC V3A 4E1'),
          status: 'CANCELLED',
        },
      ],
    }),
    recomputeActiveJobCounts(prisma),
  ])
}

function job(
  id: string,
  title: string,
  skillId: string,
  scheduledDate: Date,
  technicianId: string | null,
  cityId: string,
  address: string,
) {
  return {
    id,
    title,
    description: `${title} (test fixture)`,
    customerName: 'Test Customer',
    address,
    cityId,
    skillId,
    priority: 'MEDIUM' as const,
    scheduledDate,
    status: technicianId ? ('ASSIGNED' as const) : ('OPEN' as const),
    technicianId,
    assignedAt: technicianId ? new Date('2029-12-31T12:00:00Z') : null,
    completedAt: null,
  }
}
