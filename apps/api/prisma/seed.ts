import { faker } from '@faker-js/faker'
import { prisma } from '../src/db'
import type { Priority } from '../src/generated/prisma/client'

faker.seed(20260910)

const DESIGNATIONS = ['Apprentice Technician', 'Technician', 'Senior Technician', 'Lead Technician']
const REGIONS = ['North', 'South', 'East', 'West', 'Central']

const JOB_TEMPLATES = {
  HVAC: [
    ['AC unit not cooling', 'Central air runs but blows warm air throughout the house.'],
    ['Furnace making loud noise', 'Banging sound when the furnace starts up.'],
    ['Annual HVAC maintenance', 'Seasonal inspection, filter change and coil cleaning.'],
    ['Thermostat not responding', 'Smart thermostat screen is on but the system ignores changes.'],
    ['Heat pump short cycling', 'Heat pump turns on and off every few minutes.'],
    ['Weak airflow from vents', 'Upstairs rooms get very little airflow.'],
  ],
  Electrical: [
    ['Breaker keeps tripping', 'Kitchen circuit trips whenever the microwave runs.'],
    ['Install ceiling fan', 'Replace bedroom light fixture with a ceiling fan.'],
    ['Outlet not working', 'Two living room outlets have no power.'],
    ['Flickering lights', 'Lights flicker in several rooms, worse in the evening.'],
    ['Upgrade electrical panel', 'Customer wants to upgrade from 100A to 200A service.'],
    ['Install EV charger', 'Install a Level 2 charger in the garage.'],
  ],
  Plumbing: [
    ['Replace water heater', 'Water heater is 15 years old and leaking at the base.'],
    ['Leaking kitchen faucet', 'Constant drip from the kitchen faucet spout.'],
    ['Clogged main drain', 'Multiple drains backing up on the ground floor.'],
    ['Running toilet', 'Upstairs toilet keeps running after flushing.'],
    ['Low water pressure', 'Low pressure in all bathroom fixtures.'],
    ['Leak under bathroom sink', 'Water pooling in the vanity cabinet.'],
  ],
  'Appliance Repair': [
    ['Dishwasher not draining', 'Standing water left at the bottom after each cycle.'],
    ['Refrigerator not cooling', 'Fridge section is warm while the freezer still works.'],
    ["Washer won't spin", 'Washing machine fills and agitates but will not spin.'],
    ['Dryer not heating', 'Dryer tumbles but clothes stay damp.'],
    ['Oven temperature inaccurate', 'Oven runs about 50 degrees cooler than the setting.'],
    ['Ice maker not working', 'Ice maker stopped producing ice last week.'],
  ],
} satisfies Record<string, [title: string, description: string][]>

type Skill = keyof typeof JOB_TEMPLATES
const SKILLS = Object.keys(JOB_TEMPLATES) as Skill[]

// Deliberately uneven workload per technician (sums to 24 assigned jobs).
const TECHNICIAN_LOADS = [6, 5, 3, 2, 2, 2, 1, 1, 1, 1, 0, 0]
const UNASSIGNED_JOB_COUNT = 16

function scheduledDate(): Date {
  const today = new Date()
  const offsetDays = faker.number.int({ min: 0, max: 14 })
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offsetDays))
}

function priority(): Priority {
  return faker.helpers.weightedArrayElement([
    { weight: 3, value: 'LOW' },
    { weight: 5, value: 'MEDIUM' },
    { weight: 3, value: 'HIGH' },
    { weight: 1, value: 'URGENT' },
  ])
}

function job(skill: Skill, technicianId: string | null) {
  const [title, description] = faker.helpers.arrayElement(JOB_TEMPLATES[skill])
  return {
    id: faker.string.uuid(),
    title,
    description,
    customerName: faker.person.fullName(),
    address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
    requiredSkill: skill,
    priority: priority(),
    scheduledDate: scheduledDate(),
    technicianId,
    assignedAt: technicianId ? faker.date.recent({ days: 5 }) : null,
  }
}

async function main() {
  const technicians = TECHNICIAN_LOADS.map(() => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    return {
      id: faker.string.uuid(),
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName, provider: 'fieldservice.example' }).toLowerCase(),
      phone: faker.phone.number({ style: 'national' }),
      designation: faker.helpers.arrayElement(DESIGNATIONS),
      region: faker.helpers.arrayElement(REGIONS),
      skills: faker.helpers.arrayElements(SKILLS, { min: 1, max: 3 }),
    }
  })

  // Assigned jobs always require a skill the technician has.
  const assignedJobs = technicians.flatMap((technician, index) =>
    Array.from({ length: TECHNICIAN_LOADS[index] ?? 0 }, () =>
      job(faker.helpers.arrayElement(technician.skills), technician.id),
    ),
  )
  const unassignedJobs = Array.from({ length: UNASSIGNED_JOB_COUNT }, (_, index) =>
    job(SKILLS[index % SKILLS.length]!, null),
  )

  // Idempotent: wipe and re-insert in a single transaction.
  await prisma.$transaction([
    prisma.job.deleteMany(),
    prisma.technician.deleteMany(),
    prisma.technician.createMany({ data: technicians }),
    prisma.job.createMany({ data: [...assignedJobs, ...unassignedJobs] }),
  ])

  console.log(
    `Seeded ${technicians.length} technicians and ${assignedJobs.length + unassignedJobs.length} jobs ` +
      `(${assignedJobs.length} assigned, ${unassignedJobs.length} unassigned).`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
