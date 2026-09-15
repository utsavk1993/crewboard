import { fakerEN_CA as faker } from '@faker-js/faker'
import { prisma } from '../src/db'
import type { Priority } from '../src/generated/prisma/client'
import { recomputeActiveJobCounts } from '../src/workload-counter'
import type { SeedCategory, SeedCity, SeedSkill } from './seed-data'
import {
  areaCodes,
  buildGeography,
  buildTaxonomy,
  citySpecs,
  DESIGNATIONS,
  findByName,
  IN_REGION_PROBABILITY,
  jobTemplates,
  POSTAL_LETTERS,
  PRIORITY_WEIGHTS,
  ROSTER,
  SECOND_CATEGORY_PROBABILITY,
  SPECIALTIES_PER_TECHNICIAN,
  TENURE_DAYS,
} from './seed-data'

faker.seed(20260910)

const UNASSIGNED_JOBS_PER_REGION: Record<string, number> = {
  'Metro Vancouver': 16,
  'Fraser Valley': 5,
  'Capital Region': 5,
  'Central Okanagan': 4,
  'Calgary Region': 3,
  'Edmonton Region': 3,
}

// Closed history: completed jobs per technician within the last HISTORY_DAYS (or since they were hired),
// plus jobs customers cancelled before anyone was assigned.
const COMPLETED_JOBS_PER_TECHNICIAN: [min: number, max: number] = [2, 6]
const HISTORY_DAYS = 120
const CANCELLED_JOBS = 8

// 2–5 specialties from a primary category (rotated so every trade is covered), sometimes plus a second one.
function pickSpecialties(primary: SeedCategory, categories: SeedCategory[], skills: SeedSkill[]): SeedSkill[] {
  const categoryIds = new Set([primary.id])
  if (faker.datatype.boolean({ probability: SECOND_CATEGORY_PROBABILITY })) {
    categoryIds.add(faker.helpers.arrayElement(categories.filter(({ id }) => id !== primary.id)).id)
  }
  const [min, max] = SPECIALTIES_PER_TECHNICIAN
  const pool = skills.filter((skill) => categoryIds.has(skill.categoryId))
  return faker.helpers.arrayElements(pool, { min, max: Math.min(max, pool.length) })
}

function scheduledDate(): Date {
  const today = new Date()
  const offsetDays = faker.number.int({ min: 0, max: 14 })
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offsetDays))
}

function priority(): Priority {
  return faker.helpers.weightedArrayElement(PRIORITY_WEIGHTS)
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
    status: technicianId ? ('ASSIGNED' as const) : ('OPEN' as const),
    technicianId,
    assignedAt: technicianId ? faker.date.recent({ days: 5 }) : null,
  }
}

const utcDaysAgo = (today: Date, days: number) =>
  new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days))

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000)

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
  const tenureDays = roster.map(({ technician }) => {
    const [min, max] = TENURE_DAYS[technician.designation]!
    return faker.number.int({ min, max })
  })
  const technicians = roster.map(({ technician }, index) => ({
    ...technician,
    hiredOn: utcDaysAgo(today, tenureDays[index]!),
  }))

  // History is drawn last of all, so it doesn't shift technicians, hire dates or active jobs.
  // Each completed job was assigned up to a week before its scheduled day (never before the hire date)
  // and completed during that day.
  const completedJobs = roster.flatMap(({ technician, city: home, specialties }, index) => {
    const [min, max] = COMPLETED_JOBS_PER_TECHNICIAN
    const windowDays = Math.min(HISTORY_DAYS, tenureDays[index]! - 8)
    return Array.from({ length: faker.number.int({ min, max }) }, () => {
      const inRegion = faker.datatype.boolean({ probability: IN_REGION_PROBABILITY })
      const city = faker.helpers.arrayElement(inRegion ? citiesInRegion(home.regionId) : citiesElsewhereInProvince(home))
      const scheduled = utcDaysAgo(today, faker.number.int({ min: 1, max: windowDays }))
      const assignedAt = addMinutes(scheduled, -faker.number.int({ min: 12 * 60, max: 7 * 24 * 60 }))
      // 16:00–23:59 UTC is roughly business hours in BC and Alberta.
      const completedAt = addMinutes(scheduled, faker.number.int({ min: 16 * 60, max: 24 * 60 - 1 }))
      return {
        ...job(faker.helpers.arrayElement(specialties), technician.id, city, provinceCodeOf(city)),
        scheduledDate: scheduled,
        status: 'COMPLETED' as const,
        assignedAt,
        completedAt,
        createdAt: addMinutes(assignedAt, -faker.number.int({ min: 0, max: 3 * 24 * 60 })),
        updatedAt: completedAt,
      }
    })
  })
  const cancelledJobs = Array.from({ length: CANCELLED_JOBS }, (_, index) => {
    const category = categories[index % categories.length]!
    const city = faker.helpers.arrayElement(cities)
    const skill = faker.helpers.arrayElement(skills.filter(({ categoryId }) => categoryId === category.id))
    const cancelledAt = utcDaysAgo(today, faker.number.int({ min: 1, max: HISTORY_DAYS }))
    return {
      ...job(skill, null, city, provinceCodeOf(city)),
      scheduledDate: addMinutes(cancelledAt, faker.number.int({ min: 1, max: 14 }) * 24 * 60),
      status: 'CANCELLED' as const,
      createdAt: addMinutes(cancelledAt, -faker.number.int({ min: 1, max: 10 }) * 24 * 60),
      updatedAt: addMinutes(cancelledAt, faker.number.int({ min: 16 * 60, max: 24 * 60 - 1 })),
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
    prisma.job.createMany({ data: [...assignedJobs, ...unassignedJobs, ...completedJobs, ...cancelledJobs] }),
    recomputeActiveJobCounts(prisma),
  ])

  const activeCount = assignedJobs.length + unassignedJobs.length
  console.log(
    `Seeded ${technicians.length} technicians and ${activeCount} active jobs ` +
      `(${assignedJobs.length} assigned, ${unassignedJobs.length} open), ` +
      `plus ${completedJobs.length} completed and ${cancelledJobs.length} cancelled.`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
