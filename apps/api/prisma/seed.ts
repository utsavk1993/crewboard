import { faker } from '@faker-js/faker'
import { prisma } from '../src/db'
import type { Priority } from '../src/generated/prisma/client'

faker.seed(20260910)

const DESIGNATIONS = ['Apprentice Technician', 'Technician', 'Senior Technician', 'Lead Technician']
const REGIONS = ['North', 'South', 'East', 'West', 'Central']

type JobTemplate = [title: string, description: string]

// Category › specialty › job templates. Specialty names are globally unique.
const TAXONOMY: Record<string, Record<string, JobTemplate[]>> = {
  HVAC: {
    Furnaces: [
      ['Furnace not igniting', 'High-efficiency gas furnace clicks on cold mornings but never lights.'],
      ['Annual furnace tune-up', 'Pre-winter inspection, filter change and heat exchanger check.'],
    ],
    'Heat Pumps': [
      ['Heat pump short cycling', 'Air-source heat pump turns on and off every few minutes.'],
      ['Heat pump iced over', 'Outdoor unit is covered in ice and the defrost cycle never runs.'],
    ],
    'Air Conditioning': [
      ['AC unit not cooling', 'Central air runs but blows warm air throughout the house.'],
      ['AC condensate leak', 'Water pools around the indoor coil whenever the AC runs.'],
    ],
    Ductwork: [
      ['Weak airflow from vents', 'Upstairs bedrooms get very little airflow from the supply vents.'],
      ['Seal basement ductwork', 'Seal leaking duct joints in the unfinished basement.'],
    ],
    'Thermostats & Controls': [
      ['Thermostat not responding', 'Smart thermostat screen is on but the system ignores changes.'],
      ['Add a heating zone', 'Add zone dampers and a second thermostat for the finished basement.'],
    ],
  },
  Electrical: {
    'Panel Upgrades': [
      ['Upgrade electrical panel', 'Upgrade from 100A to 200A service ahead of a kitchen renovation.'],
      ['Breaker keeps tripping', 'Kitchen circuit trips whenever the microwave and kettle run together.'],
    ],
    'EV Chargers': [
      ['Install EV charger', 'Install a Level 2 charger on a dedicated circuit in the garage.'],
      ['EV charger faulting', 'Wall charger reports a ground fault and stops mid-session.'],
    ],
    Lighting: [
      ['Flickering lights', 'Lights flicker in several rooms, worse in the evening.'],
      ['Install pot lights', 'Add six LED pot lights on a dimmer in the living room.'],
    ],
    'Wiring & Outlets': [
      ['Outlet not working', 'Two living room outlets have no power.'],
      ['Add GFCI outlets', 'Replace bathroom and exterior outlets with GFCI protection.'],
    ],
    Generators: [
      ["Standby generator won't start", 'Natural gas standby generator failed its weekly self-test.'],
      ['Install generator transfer switch', 'Connect a portable generator to the panel with a manual transfer switch.'],
    ],
  },
  Plumbing: {
    'Water Heaters': [
      ['Replace water heater', 'Tank water heater is 15 years old and leaking at the base.'],
      ['No hot water', 'Tankless water heater shows an error code and only delivers cold water.'],
    ],
    'Drains & Sewer': [
      ['Clogged main drain', 'Multiple drains are backing up in the basement.'],
      ['Sewer line camera inspection', 'Recurring backups; inspect the sewer lateral for tree roots.'],
    ],
    'Fixtures & Faucets': [
      ['Leaking kitchen faucet', 'Constant drip from the kitchen faucet spout.'],
      ['Running toilet', 'Upstairs toilet keeps running after flushing.'],
    ],
    'Leak Detection': [
      ['Water stain on ceiling', 'Brown stain spreading on the ceiling below the main bathroom.'],
      ['Unexplained high water bill', 'Water bill doubled with no change in usage, suggesting a hidden leak.'],
    ],
    'Sump Pumps': [
      ['Sump pump not cycling', 'The pit fills during the spring melt but the pump never turns on.'],
      ['Install backup sump pump', 'Add a battery backup pump before the spring thaw.'],
    ],
  },
  'Appliance Repair': {
    Refrigerators: [
      ['Refrigerator not cooling', 'Fridge section is warm while the freezer still works.'],
      ['Ice maker not working', 'Ice maker stopped producing ice last week.'],
    ],
    'Washers & Dryers': [
      ["Washer won't spin", 'Front-load washer fills and agitates but will not spin.'],
      ['Dryer not heating', 'Dryer tumbles but clothes stay damp after a full cycle.'],
    ],
    Dishwashers: [
      ['Dishwasher not draining', 'Standing water left at the bottom after each cycle.'],
      ['Dishwasher leaking', 'Water leaks from under the door onto the kitchen floor.'],
    ],
    'Ovens & Ranges': [
      ['Oven temperature inaccurate', 'Oven runs about 25°C cooler than the setting.'],
      ['Cooktop element not heating', 'Front-left element on the electric range stays cold on every setting.'],
    ],
    Microwaves: [['Microwave not heating', 'Over-the-range microwave runs and turns but food stays cold.']],
  },
  'Gas Fitting': {
    'Gas Fireplaces': [
      ['Fireplace pilot keeps going out', 'Gas fireplace pilot lights but goes out after a few seconds.'],
      ['Annual gas fireplace service', 'Clean the burner and glass and check the venting before winter.'],
    ],
    'Gas Lines': [
      ['Run gas line for new range', 'Extend the gas line to the kitchen for a new gas range.'],
      ['Gas odour near appliances', 'Faint gas smell near the furnace room; the utility has checked the meter side.'],
    ],
    'BBQs & Patio Heaters': [
      ['Install BBQ gas outlet', 'Add a quick-connect natural gas outlet on the back deck for the BBQ.'],
      ['Patio heater not lighting', 'Restaurant patio heater igniter sparks but the burner will not stay lit.'],
    ],
  },
  Refrigeration: {
    'Walk-in Coolers': [
      ['Walk-in cooler warming up', 'Restaurant walk-in cooler is holding at 9°C instead of 3°C.'],
      ['Replace walk-in door gaskets', 'Torn door gaskets are letting warm air into the walk-in cooler.'],
    ],
    'Ice Machines': [
      ['Ice machine making thin ice', 'Café ice machine makes thin, cloudy cubes with slow harvest cycles.'],
      ['Ice machine clean and descale', 'Scheduled cleaning and descaling of the bar ice machine.'],
    ],
    'Commercial Freezers': [
      ['Reach-in freezer frosting up', 'Heavy frost is building up on the evaporator of a convenience store freezer.'],
    ],
  },
  'Smart Home & Security': {
    'Alarm Systems': [
      ['Alarm panel trouble signal', 'Alarm keypad keeps beeping with a low-battery trouble code.'],
      ['Install monitored alarm system', 'Door contacts, motion sensors and a keypad for a new townhouse.'],
    ],
    'Security Cameras': [
      ['Install security cameras', 'Mount four PoE cameras around the house with a network video recorder.'],
      ['Camera keeps going offline', 'Driveway camera drops off the network every night.'],
    ],
    'Smart Locks & Doorbells': [
      ['Install video doorbell', 'Replace the wired doorbell with a video doorbell and chime.'],
      ['Smart lock not responding', 'Front door smart lock no longer responds to the app or keypad.'],
    ],
    'Home Networking': [
      ['Weak Wi-Fi upstairs', 'Install a mesh Wi-Fi system to cover the second floor and garage.'],
      ['Run Ethernet to home office', 'Run Cat6 from the basement network panel to the home office.'],
    ],
  },
}

// Deliberately uneven workload per technician (sums to 24 assigned jobs).
const TECHNICIAN_LOADS = [6, 5, 3, 2, 2, 2, 1, 1, 1, 1, 0, 0]
const UNASSIGNED_JOB_COUNT = 16

type SeedCategory = { id: string; name: string }
type SeedSkill = { id: string; name: string; categoryId: string }

const jobTemplates = new Map<string, JobTemplate[]>()

function buildTaxonomy() {
  const categories: SeedCategory[] = []
  const skills: SeedSkill[] = []
  for (const [categoryName, specialties] of Object.entries(TAXONOMY)) {
    const category = { id: faker.string.uuid(), name: categoryName }
    categories.push(category)
    for (const [name, templates] of Object.entries(specialties)) {
      const skill = { id: faker.string.uuid(), name, categoryId: category.id }
      skills.push(skill)
      jobTemplates.set(skill.id, templates)
    }
  }
  return { categories, skills }
}

// 2–5 specialties from a primary category (rotated so every trade is covered), sometimes plus a second one.
function pickSpecialties(primary: SeedCategory, categories: SeedCategory[], skills: SeedSkill[]): SeedSkill[] {
  const categoryIds = new Set([primary.id])
  if (faker.datatype.boolean()) {
    categoryIds.add(faker.helpers.arrayElement(categories.filter(({ id }) => id !== primary.id)).id)
  }
  const pool = skills.filter((skill) => categoryIds.has(skill.categoryId))
  return faker.helpers.arrayElements(pool, { min: 2, max: Math.min(5, pool.length) })
}

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

function job(skill: SeedSkill, technicianId: string | null) {
  const [title, description] = faker.helpers.arrayElement(jobTemplates.get(skill.id) ?? [])
  return {
    id: faker.string.uuid(),
    title,
    description,
    customerName: faker.person.fullName(),
    address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
    skillId: skill.id,
    priority: priority(),
    scheduledDate: scheduledDate(),
    technicianId,
    assignedAt: technicianId ? faker.date.recent({ days: 5 }) : null,
  }
}

async function main() {
  const { categories, skills } = buildTaxonomy()

  const roster = TECHNICIAN_LOADS.map((load, index) => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const technician = {
      id: faker.string.uuid(),
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName, provider: 'fieldservice.example' }).toLowerCase(),
      phone: faker.phone.number({ style: 'national' }),
      designation: faker.helpers.arrayElement(DESIGNATIONS),
      region: faker.helpers.arrayElement(REGIONS),
    }
    const primary = categories[index % categories.length]!
    return { technician, specialties: pickSpecialties(primary, categories, skills), load }
  })

  const technicians = roster.map(({ technician }) => technician)
  const technicianSkills = roster.flatMap(({ technician, specialties }) =>
    specialties.map((skill) => ({ technicianId: technician.id, skillId: skill.id })),
  )

  // Assigned jobs always require a specialty the technician has.
  const assignedJobs = roster.flatMap(({ technician, specialties, load }) =>
    Array.from({ length: load }, () => job(faker.helpers.arrayElement(specialties), technician.id)),
  )
  // Unassigned jobs rotate through the categories so every trade has open work.
  const unassignedJobs = Array.from({ length: UNASSIGNED_JOB_COUNT }, (_, index) => {
    const category = categories[index % categories.length]!
    return job(faker.helpers.arrayElement(skills.filter((skill) => skill.categoryId === category.id)), null)
  })

  // Idempotent: wipe and re-insert in a single transaction.
  await prisma.$transaction([
    prisma.job.deleteMany(),
    prisma.technicianSkill.deleteMany(),
    prisma.technician.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.skillCategory.deleteMany(),
    prisma.skillCategory.createMany({ data: categories }),
    prisma.skill.createMany({ data: skills }),
    prisma.technician.createMany({ data: technicians }),
    prisma.technicianSkill.createMany({ data: technicianSkills }),
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
