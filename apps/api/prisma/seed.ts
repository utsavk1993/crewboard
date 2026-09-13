import { fakerEN_CA as faker } from '@faker-js/faker'
import { prisma } from '../src/db'
import type { Priority } from '../src/generated/prisma/client'

faker.seed(20260910)

const DESIGNATIONS = ['Apprentice Technician', 'Technician', 'Senior Technician', 'Lead Technician']

// Days since hire by designation, so apprentices are recent hires and leads have been around for years.
const TENURE_DAYS: Record<string, [min: number, max: number]> = {
  'Apprentice Technician': [30, 2 * 365],
  Technician: [365, 6 * 365],
  'Senior Technician': [4 * 365, 10 * 365],
  'Lead Technician': [9 * 365, 12 * 365],
}

// House number range, postal code prefixes (forward sortation areas) and real streets, so addresses fit the city.
type CitySpec = [houseNumbers: [min: number, max: number], postalPrefixes: string, streets: string[]]
type RegionSpec = { areaCodes: string[]; cities: Record<string, CitySpec> }

// Province › region › city. City names are unique across the whole geography.
const GEOGRAPHY: Record<string, { name: string; regions: Record<string, RegionSpec> }> = {
  BC: {
    name: 'British Columbia',
    regions: {
      'Metro Vancouver': {
        areaCodes: ['604', '778', '236'],
        cities: {
          Vancouver: [[100, 4999], 'V5K V5L V5N V5R V5V V6E V6K V6R', ['W 4th Ave', 'Commercial Dr', 'Main St', 'E 12th Ave', 'Fraser St', 'W Broadway', 'Dunbar St']],
          Burnaby: [[3000, 8999], 'V5A V5B V5C V5E V5G V5H V5J', ['Kingsway', 'Hastings St', 'Canada Way', 'Imperial St', 'Royal Oak Ave', 'Edmonds St']],
          Richmond: [[3000, 11999], 'V6V V6X V6Y V7A V7C V7E', ['No. 3 Rd', 'Granville Ave', 'Williams Rd', 'Steveston Hwy', 'Blundell Rd', 'Garden City Rd']],
          Surrey: [[5000, 19999], 'V3R V3S V3T V3V V3W V3X V4A V4N', ['72 Ave', '152 St', '88 Ave', '128 St', '64 Ave', '176 St']],
          Langley: [[4000, 26999], 'V1M V2Y V2Z V3A', ['200 St', '56 Ave', 'Fraser Hwy', '208 St', '72 Ave', 'Glover Rd']],
          'Maple Ridge': [[11000, 24999], 'V2W V2X V4R', ['Dewdney Trunk Rd', 'Lougheed Hwy', '224 St', '232 St', '124 Ave', 'River Rd']],
          Coquitlam: [[400, 3999], 'V3B V3C V3E V3J V3K', ['Austin Ave', 'Como Lake Ave', 'Pinetree Way', 'Guildford Way', 'Westwood St', 'Lougheed Hwy']],
          'North Vancouver': [[100, 4999], 'V7G V7H V7J V7L V7M V7N V7P V7R', ['Lonsdale Ave', 'Marine Dr', 'Lynn Valley Rd', 'Mountain Hwy', 'Capilano Rd', 'E Esplanade']],
        },
      },
      'Fraser Valley': {
        areaCodes: ['604', '778'],
        cities: {
          Abbotsford: [[2000, 35999], 'V2S V2T V3G V4X', ['South Fraser Way', 'Clearbrook Rd', 'McCallum Rd', 'Old Yale Rd', 'Gladwin Rd']],
          Chilliwack: [[5000, 49999], 'V2P V2R V4Z', ['Yale Rd', 'Vedder Rd', 'Luckakuck Way', 'Young Rd', 'Promontory Rd']],
          Mission: [[7000, 35999], 'V2V V4S', ['Cedar St', 'Lougheed Hwy', 'Stave Lake St', 'Cherry Ave']],
        },
      },
      'Capital Region': {
        areaCodes: ['250', '778'],
        cities: {
          Victoria: [[100, 2999], 'V8R V8S V8T V8V V8W V9A', ['Fort St', 'Cook St', 'Douglas St', 'Oak Bay Ave', 'Fairfield Rd']],
          Saanich: [[1000, 4999], 'V8N V8P V8X V8Z V9E', ['Shelbourne St', 'Quadra St', 'McKenzie Ave', 'Cedar Hill Rd', 'Blenkinsop Rd']],
          Langford: [[500, 3499], 'V9B V9C', ['Goldstream Ave', 'Veterans Memorial Pkwy', 'Jacklin Rd', 'Peatt Rd']],
        },
      },
      'Central Okanagan': {
        areaCodes: ['250', '236'],
        cities: {
          Kelowna: [[100, 4999], 'V1P V1V V1W V1X V1Y', ['Harvey Ave', 'Bernard Ave', 'Gordon Dr', 'Springfield Rd', 'Lakeshore Rd', 'Glenmore Rd']],
          'West Kelowna': [[1000, 3999], 'V1Z V4T', ['Boucherie Rd', 'Westlake Rd', 'Elliott Rd', 'Old Okanagan Hwy']],
        },
      },
    },
  },
  AB: {
    name: 'Alberta',
    regions: {
      'Calgary Region': {
        areaCodes: ['403', '587', '825'],
        cities: {
          Calgary: [[100, 9999], 'T2E T2N T2T T2X T3A T3H T3K', ['17 Ave SW', 'Macleod Trail SE', 'Crowchild Trail NW', '4 St NW', 'Edmonton Trail NE', '37 St SW']],
          Airdrie: [[100, 2999], 'T4A T4B', ['Main St N', 'Yankee Valley Blvd', '8 St SW', 'Big Springs Dr NE']],
          Cochrane: [[100, 699], 'T4C', ['Railway St W', 'Centre Ave', 'Sunset Blvd', 'Quigley Dr']],
        },
      },
      'Edmonton Region': {
        areaCodes: ['780', '587', '825'],
        cities: {
          Edmonton: [[9000, 17999], 'T5A T5K T6E T6G T6J T6W', ['82 Ave NW', 'Jasper Ave NW', '109 St NW', '124 St NW', 'Stony Plain Rd NW', '99 St NW']],
          'St. Albert': [[1, 399], 'T8N', ['St Albert Trail', 'Sir Winston Churchill Ave', 'Boudreau Rd', 'Levasseur Rd']],
          'Sherwood Park': [[1, 999], 'T8A T8B T8H', ['Baseline Rd', 'Sherwood Dr', 'Wye Rd', 'Clover Bar Rd']],
        },
      },
    },
  },
}

// Letters Canada Post uses in postal codes.
const POSTAL_LETTERS = 'ABCEGHJKLMNPRSTVWXYZ'.split('')

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

// Home base and deliberately uneven workload per technician. Most of the crew works out of Metro Vancouver.
const ROSTER: [city: string, load: number][] = [
  ['Vancouver', 6], ['Vancouver', 2], ['Vancouver', 0],
  ['Burnaby', 5], ['Burnaby', 1],
  ['Richmond', 2], ['Richmond', 1],
  ['Surrey', 5], ['Surrey', 3], ['Surrey', 0],
  ['Langley', 2], ['Langley', 1],
  ['Maple Ridge', 1],
  ['Coquitlam', 4], ['Coquitlam', 0],
  ['North Vancouver', 2],
  ['Abbotsford', 3], ['Abbotsford', 1],
  ['Chilliwack', 1],
  ['Mission', 0],
  ['Victoria', 3], ['Saanich', 1], ['Langford', 1],
  ['Kelowna', 2], ['West Kelowna', 1],
  ['Calgary', 2], ['Airdrie', 1],
  ['Edmonton', 1],
]

const UNASSIGNED_JOBS_PER_REGION: Record<string, number> = {
  'Metro Vancouver': 16,
  'Fraser Valley': 5,
  'Capital Region': 5,
  'Central Okanagan': 4,
  'Calgary Region': 3,
  'Edmonton Region': 3,
}

// Share of assigned jobs in the technician's own region; the rest are elsewhere in the same province.
const IN_REGION_PROBABILITY = 0.85

type SeedCategory = { id: string; name: string }
type SeedSkill = { id: string; name: string; categoryId: string }
type SeedRegion = { id: string; name: string; provinceCode: string }
type SeedCity = { id: string; name: string; regionId: string }

const jobTemplates = new Map<string, JobTemplate[]>()
const citySpecs = new Map<string, CitySpec>()
const areaCodes = new Map<string, string[]>()

function buildGeography() {
  const provinces = Object.entries(GEOGRAPHY).map(([code, { name }]) => ({ code, name }))
  const regions: SeedRegion[] = []
  const cities: SeedCity[] = []
  for (const [provinceCode, { regions: regionSpecs }] of Object.entries(GEOGRAPHY)) {
    for (const [regionName, spec] of Object.entries(regionSpecs)) {
      const region = { id: faker.string.uuid(), name: regionName, provinceCode }
      regions.push(region)
      areaCodes.set(region.id, spec.areaCodes)
      for (const [name, citySpec] of Object.entries(spec.cities)) {
        const city = { id: faker.string.uuid(), name, regionId: region.id }
        cities.push(city)
        citySpecs.set(city.id, citySpec)
      }
    }
  }
  return { provinces, regions, cities }
}

function findByName<T extends { name: string }>(items: T[], name: string): T {
  const item = items.find((candidate) => candidate.name === name)
  if (!item) throw new Error(`Unknown place in seed data: ${name}`)
  return item
}

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

function phone(city: SeedCity): string {
  const areaCode = faker.helpers.arrayElement(areaCodes.get(city.regionId) ?? [])
  return `(${areaCode}) ${faker.number.int({ min: 200, max: 999 })}-${faker.string.numeric(4)}`
}

// e.g. "12345 72 Ave, Surrey, BC V3W 2M9"
function address(city: SeedCity, provinceCode: string): string {
  const [[min, max], postalPrefixes, streets] = citySpecs.get(city.id)!
  const postalCode =
    `${faker.helpers.arrayElement(postalPrefixes.split(' '))} ` +
    `${faker.string.numeric(1)}${faker.helpers.arrayElement(POSTAL_LETTERS)}${faker.string.numeric(1)}`
  return `${faker.number.int({ min, max })} ${faker.helpers.arrayElement(streets)}, ${city.name}, ${provinceCode} ${postalCode}`
}

function job(skill: SeedSkill, technicianId: string | null, city: SeedCity, provinceCode: string) {
  const [title, description] = faker.helpers.arrayElement(jobTemplates.get(skill.id) ?? [])
  return {
    id: faker.string.uuid(),
    title,
    description,
    customerName: faker.person.fullName(),
    address: address(city, provinceCode),
    cityId: city.id,
    skillId: skill.id,
    priority: priority(),
    scheduledDate: scheduledDate(),
    technicianId,
    assignedAt: technicianId ? faker.date.recent({ days: 5 }) : null,
  }
}

async function main() {
  const { provinces, regions, cities } = buildGeography()
  const { categories, skills } = buildTaxonomy()

  const provinceCodeOf = (city: SeedCity) => regions.find(({ id }) => id === city.regionId)!.provinceCode
  const citiesInRegion = (regionId: string) => cities.filter((city) => city.regionId === regionId)
  const citiesElsewhereInProvince = (home: SeedCity) =>
    cities.filter((city) => city.regionId !== home.regionId && provinceCodeOf(city) === provinceCodeOf(home))

  const roster = ROSTER.map(([cityName, load], index) => {
    const city = findByName(cities, cityName)
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const technician = {
      id: faker.string.uuid(),
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName, provider: 'fieldservice.example' }).toLowerCase(),
      phone: phone(city),
      designation: faker.helpers.arrayElement(DESIGNATIONS),
      cityId: city.id,
    }
    const primary = categories[index % categories.length]!
    return { technician, city, specialties: pickSpecialties(primary, categories, skills), load }
  })

  const technicianSkills = roster.flatMap(({ technician, specialties }) =>
    specialties.map((skill) => ({ technicianId: technician.id, skillId: skill.id })),
  )

  // Assigned jobs always require a specialty the technician has, and are usually in their region.
  const assignedJobs = roster.flatMap(({ technician, city: home, specialties, load }) =>
    Array.from({ length: load }, () => {
      const inRegion = faker.datatype.boolean({ probability: IN_REGION_PROBABILITY })
      const city = faker.helpers.arrayElement(inRegion ? citiesInRegion(home.regionId) : citiesElsewhereInProvince(home))
      return job(faker.helpers.arrayElement(specialties), technician.id, city, provinceCodeOf(city))
    }),
  )
  // Unassigned jobs rotate through the categories so every trade has open work, in every region.
  const unassignedJobs = Object.entries(UNASSIGNED_JOBS_PER_REGION)
    .flatMap(([regionName, count]) => Array.from({ length: count }, () => findByName(regions, regionName)))
    .map((region, index) => {
      const category = categories[index % categories.length]!
      const city = faker.helpers.arrayElement(citiesInRegion(region.id))
      const skill = faker.helpers.arrayElement(skills.filter(({ categoryId }) => categoryId === category.id))
      return job(skill, null, city, region.provinceCode)
    })

  // Hire dates are drawn after everything else, so they don't shift any other seeded value.
  const today = new Date()
  const technicians = roster.map(({ technician }) => {
    const [min, max] = TENURE_DAYS[technician.designation]!
    const daysAgo = faker.number.int({ min, max })
    return {
      ...technician,
      hiredOn: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - daysAgo)),
    }
  })

  // Idempotent: wipe and re-insert in a single transaction.
  await prisma.$transaction([
    prisma.job.deleteMany(),
    prisma.technicianSkill.deleteMany(),
    prisma.technician.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.skillCategory.deleteMany(),
    prisma.city.deleteMany(),
    prisma.region.deleteMany(),
    prisma.province.deleteMany(),
    prisma.province.createMany({ data: provinces }),
    prisma.region.createMany({ data: regions }),
    prisma.city.createMany({ data: cities }),
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
