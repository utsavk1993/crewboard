import { parseArgs } from 'node:util'
import { fakerEN_CA as faker } from '@faker-js/faker'
import { z } from 'zod'
import { prisma } from '../src/db'
import { recomputeActiveJobCounts } from '../src/workload-counter'
import {
  areaCodes,
  buildGeography,
  buildTaxonomy,
  citySpecs,
  DESIGNATIONS,
  GEOGRAPHY,
  IN_REGION_PROBABILITY,
  jobTemplates,
  POSTAL_LETTERS,
  PRIORITY_WEIGHTS,
  ROSTER,
  SECOND_CATEGORY_PROBABILITY,
  SPECIALTIES_PER_TECHNICIAN,
  TAXONOMY,
  TENURE_DAYS,
} from './seed-data'

// A Canada-wide dataset to develop and demo against at scale. Only the reference data is written from
// here: the dev seed's geography and taxonomy, a pool of names and a few small lookup tables. The
// technicians and jobs are generated inside Postgres from `generate_series`, one statement per group.
//
// Every random choice a row needs is drawn once in a materialized `draws` CTE and joined to the lookup
// tables by key. Drawing inside an uncorrelated subquery instead would let the planner hoist it and
// hand every row the same value.

faker.seed(20260914)

const DEFAULT_TECHNICIANS = 50_000
const DEFAULT_JOBS = 1_000_000

// Status mix. ASSIGNED falls out of the technician workloads below; the other three split whatever is
// left in proportion, so the four groups always add up to exactly the number of jobs asked for.
const COMPLETED_SHARE = 0.92
const ASSIGNED_SHARE = 0.04
const OPEN_SHARE = 0.03
const CANCELLED_SHARE = 0.01

// Closed history covers three years; the open backlog was logged over the last three weeks.
const HISTORY_DAYS = 3 * 365
const BACKLOG_DAYS = 21

// Busy technicians hold 1–MAX_ACTIVE_LOAD jobs, drawn as the smaller of two uniform picks so light
// workloads are the most common; the rest of the crew holds none.
const MAX_ACTIVE_LOAD = 8
// Mean of that draw, E[1 + min(u, u')] for u uniform over 0..MAX_ACTIVE_LOAD-1, which sizes the busy share.
const MEAN_ACTIVE_LOAD = 1 + ((MAX_ACTIVE_LOAD - 1) * (2 * MAX_ACTIVE_LOAD - 1)) / (6 * MAX_ACTIVE_LOAD)

// Hire dates stretch over HIRE_YEARS of company history: the dev seed's tenure bands scaled up, so
// apprentices are still the recent hires and the longest-serving leads go back the furthest.
const HIRE_YEARS = 15

// Technician and customer names are drawn from a pool of first and last names, so this many of each
// covers 160,000 combinations; a technician's ordinal keeps their email address unique.
const NAME_POOL_SIZE = 400

// Fixed Postgres random seed, so repeated runs produce comparable data.
const RANDOM_SEED = 0.62

// Generating a million jobs takes minutes, not the default few seconds.
const TRANSACTION_TIMEOUT_MS = 20 * 60_000

const CATEGORY_COUNT = Object.keys(TAXONOMY).length
const SKILL_COUNT = Object.values(TAXONOMY).reduce((total, specialties) => total + Object.keys(specialties).length, 0)
const CITY_COUNT = Object.values(GEOGRAPHY)
  .flatMap(({ regions }) => Object.values(regions))
  .reduce((total, { cities }) => total + Object.keys(cities).length, 0)
// Home bases and unassigned work follow the dev seed's roster, plus one unit per city so nowhere is
// left without a crew. The roster already leans heavily on Metro Vancouver.
const CITY_WEIGHT_TOTAL = CITY_COUNT + ROSTER.length

// --- SQL fragments -------------------------------------------------------------------------------

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`
const textArray = (values: readonly string[]) => `ARRAY[${values.map(quote).join(', ')}]`
/** Random element of a literal array of known length. */
const randomElement = (array: string, length: number) => `(${array})[1 + floor(random() * ${length})::int]`
/** Element of an array column, chosen by a `random()` already drawn into `pick`. */
const itemAt = (column: string, pick: string) => `${column}[1 + floor(${pick} * array_length(${column}, 1))::int]`
const randomItem = (column: string) => itemAt(column, 'random()')
const randomInt = (min: number, max: number) => `(${min} + floor(random() * ${max - min + 1})::int)`
const randomMinutes = (min: number, max: number) => `make_interval(mins => ${randomInt(min, max)})`

const JOB_COLUMNS =
  'id, title, description, customer_name, address, city_id, skill_id, priority, ' +
  'scheduled_date, status, technician_id, assigned_at, completed_at, created_at, updated_at'

// Two independent draws from the name pool, for a technician or a customer.
const NAME_DRAWS = `${randomInt(1, NAME_POOL_SIZE)} AS first_rank, ${randomInt(1, NAME_POOL_SIZE)} AS last_rank`
const JOIN_NAMES = `
  JOIN seed_names first_names ON first_names.rank = draws.first_rank
  JOIN seed_names last_names ON last_names.rank = draws.last_rank`
const FULL_NAME = "first_names.first_name || ' ' || last_names.last_name"

// One of the specialty's job templates; the title and description come from the same one.
const TEMPLATE_DRAW = 'random() AS template_pick'
const TITLE = itemAt('skill.titles', 'draws.template_pick')
const DESCRIPTION = itemAt('skill.descriptions', 'draws.template_pick')

// Work a technician can take: one of their own specialties, usually at a site in their own region.
const SPECIALTY_DRAW = 'random() AS specialty_pick'
const JOIN_SPECIALTY = `
  JOIN seed_skills skill ON skill.skill_id = ${itemAt('draws.specialty_ids', 'draws.specialty_pick')}`
const HOME_SITE_DRAWS = 'random() AS in_region, random() AS city_pick'
const JOIN_HOME_SITE = `
  JOIN seed_regions region ON region.region_id = draws.region_id
  JOIN seed_cities city ON city.city_id = CASE WHEN draws.in_region < ${IN_REGION_PROBABILITY}
    THEN ${itemAt('region.city_ids', 'draws.city_pick')}
    ELSE ${itemAt('region.other_city_ids', 'draws.city_pick')}
  END`

// Unassigned work: any specialty, anywhere, weighted the same way as the crew.
const ANY_SPECIALTY_DRAW = `${randomInt(1, SKILL_COUNT)} AS skill_rank`
const JOIN_ANY_SPECIALTY = 'JOIN seed_skills skill ON skill.rank = draws.skill_rank'
const DEMAND_SITE_DRAW = `${randomInt(1, CITY_WEIGHT_TOTAL)} AS city_rank`
const JOIN_DEMAND_SITE = `
  JOIN seed_city_weights demand ON demand.rank = draws.city_rank
  JOIN seed_cities city ON city.city_id = demand.city_id`

// e.g. "12345 72 Ave, Surrey, BC V3W 2M9" — house number, street and postal code all fit the city.
const ADDRESS = `format('%s %s, %s, %s %s %s%s%s',
    city.house_min + floor(random() * (city.house_max - city.house_min + 1))::int,
    ${randomItem('city.streets')},
    city.city_name,
    city.province_code,
    ${randomItem('city.postal_prefixes')},
    ${randomInt(0, 9)},
    ${randomElement(textArray(POSTAL_LETTERS), POSTAL_LETTERS.length)},
    ${randomInt(0, 9)})`

const PHONE = `format('(%s) %s-%s',
    ${randomItem('city.area_codes')}, ${randomInt(200, 999)}, lpad(${randomInt(0, 9999)}::text, 4, '0'))`

const PRIORITY_MIX = PRIORITY_WEIGHTS.flatMap(({ weight, value }) => Array.from({ length: weight }, () => value))
const PRIORITY = `${randomElement(textArray(PRIORITY_MIX), PRIORITY_MIX.length)}::"Priority"`

// Active work is scheduled from today out to two weeks.
const SCHEDULED_SOON_DRAW = `${randomInt(0, 14)} AS scheduled_in`
const SCHEDULED_SOON = '(current_date + draws.scheduled_in)'

// --- flags ---------------------------------------------------------------------------------------

function count(name: string, value: string): number {
  const parsed = z.coerce.number().int().positive().safeParse(value)
  if (!parsed.success) throw new Error(`--${name} must be a positive whole number, got "${value}"`)
  return parsed.data
}

const { values } = parseArgs({
  options: {
    technicians: { type: 'string', default: String(DEFAULT_TECHNICIANS) },
    jobs: { type: 'string', default: String(DEFAULT_JOBS) },
  },
})

// --- lookup tables -------------------------------------------------------------------------------

/** A small table the generated SQL draws from, loaded as JSON in a single statement. */
type LookupTable = {
  name: string
  /** Doubles as the `jsonb_to_recordset` definition, so the payload keys line up with the columns. */
  columns: string
  constraints: string
  rows: Record<string, unknown>[]
}

const asciiSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase()

function referenceData() {
  const { provinces, regions, cities } = buildGeography()
  const { categories, skills } = buildTaxonomy()

  const names = Array.from({ length: NAME_POOL_SIZE }, (_, index) => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    return {
      rank: index + 1,
      first_name: firstName,
      first_slug: asciiSlug(firstName),
      last_name: lastName,
      last_slug: asciiSlug(lastName),
    }
  })

  const cityRows = cities.map((city) => {
    const [[houseMin, houseMax], postalPrefixes, streets] = citySpecs.get(city.id)!
    return {
      city_id: city.id,
      region_id: city.regionId,
      province_code: regions.find(({ id }) => id === city.regionId)!.provinceCode,
      city_name: city.name,
      house_min: houseMin,
      house_max: houseMax,
      postal_prefixes: postalPrefixes.split(' '),
      streets,
      area_codes: areaCodes.get(city.regionId)!,
    }
  })

  const skillRows = skills.map((skill, index) => {
    const templates = jobTemplates.get(skill.id)!
    return {
      rank: index + 1,
      skill_id: skill.id,
      category_rank: categories.findIndex(({ id }) => id === skill.categoryId) + 1,
      titles: templates.map(([title]) => title),
      descriptions: templates.map(([, description]) => description),
    }
  })

  // One weight unit per rostered technician in the city, plus one for the city itself.
  const cityWeights = cities
    .flatMap((city) => Array.from({ length: 1 + ROSTER.filter(([name]) => name === city.name).length }, () => city.id))
    .map((cityId, index) => ({ rank: index + 1, city_id: cityId }))

  const longestTenure = Math.max(...Object.values(TENURE_DAYS).map(([, max]) => max))
  const stretch = (HIRE_YEARS * 365) / longestTenure
  const designations = DESIGNATIONS.map((designation, index) => {
    const [min, max] = TENURE_DAYS[designation]!
    return { rank: index + 1, designation, min_days: Math.round(min * stretch), max_days: Math.round(max * stretch) }
  })

  const lookups: LookupTable[] = [
    {
      name: 'seed_names',
      columns: 'rank int, first_name text, first_slug text, last_name text, last_slug text',
      constraints: 'PRIMARY KEY (rank)',
      rows: names,
    },
    {
      name: 'seed_cities',
      columns:
        'city_id uuid, region_id uuid, province_code text, city_name text, house_min int, house_max int, ' +
        'postal_prefixes text[], streets text[], area_codes text[]',
      constraints: 'PRIMARY KEY (city_id)',
      rows: cityRows,
    },
    {
      name: 'seed_skills',
      columns: 'rank int, skill_id uuid, category_rank int, titles text[], descriptions text[]',
      constraints: 'PRIMARY KEY (skill_id), UNIQUE (rank)',
      rows: skillRows,
    },
    {
      name: 'seed_city_weights',
      columns: 'rank int, city_id uuid',
      constraints: 'PRIMARY KEY (rank)',
      rows: cityWeights,
    },
    {
      name: 'seed_designations',
      columns: 'rank int, designation text, min_days int, max_days int',
      constraints: 'PRIMARY KEY (rank)',
      rows: designations,
    },
  ]
  return { provinces, regions, cities, categories, skills, lookups }
}

// --- generation ----------------------------------------------------------------------------------

const seconds = (from: number) => `${((Date.now() - from) / 1000).toFixed(1)}s`
const rows = (value: number) => value.toLocaleString('en-CA')

async function step<T>(label: string, run: () => Promise<T>): Promise<T> {
  const startedAt = Date.now()
  const result = await run()
  console.log(`  ${label} (${seconds(startedAt)})`)
  return result
}

async function main() {
  const startedAt = Date.now()
  const technicianCount = count('technicians', values.technicians)
  const jobCount = count('jobs', values.jobs)
  const { provinces, regions, cities, categories, skills, lookups } = referenceData()

  // A busy technician holds MEAN_ACTIVE_LOAD jobs on average, so this share of the crew covers the
  // assigned jobs the status mix asks for. Very few jobs per technician can only fill part of a workload.
  const busyShare = Math.min(1, (jobCount * ASSIGNED_SHARE) / technicianCount / MEAN_ACTIVE_LOAD)

  const jobs = await prisma.$transaction(
    async (tx) => {
      const run = (sql: string, ...args: unknown[]) => tx.$executeRawUnsafe(sql, ...args)

      await step('wiped the dataset', async () => {
        // A fixed seed and sequential plans keep the random draws, and so the generated data, stable between runs.
        await run(`SET LOCAL seed = ${RANDOM_SEED}`)
        await run('SET LOCAL max_parallel_workers_per_gather = 0')
        await run('TRUNCATE jobs, technician_skills, technicians, skills, skill_categories, cities, regions, provinces')
      })

      await step(`wrote ${regions.length} regions and ${cities.length} cities in ${provinces.length} provinces`, async () => {
        await tx.province.createMany({ data: provinces })
        await tx.region.createMany({ data: regions })
        await tx.city.createMany({ data: cities })
      })

      await step(`wrote ${categories.length} skill categories and ${skills.length} specialties`, async () => {
        await tx.skillCategory.createMany({ data: categories })
        await tx.skill.createMany({ data: skills })
      })

      await step('loaded the lookup tables', async () => {
        for (const { name, columns, constraints, rows: payload } of lookups) {
          await run(`CREATE TEMP TABLE ${name} (${columns}, ${constraints}) ON COMMIT DROP`)
          await run(
            `INSERT INTO ${name} SELECT * FROM jsonb_to_recordset($1::jsonb) AS payload(${columns})`,
            JSON.stringify(payload),
          )
        }
        // The specialties of each category, and the cities of each region and of the rest of its province.
        await run('CREATE TEMP TABLE seed_categories (rank int PRIMARY KEY, skill_ids uuid[]) ON COMMIT DROP')
        await run(
          'INSERT INTO seed_categories SELECT category_rank, array_agg(skill_id) FROM seed_skills GROUP BY category_rank',
        )
        await run(
          'CREATE TEMP TABLE seed_regions (region_id uuid PRIMARY KEY, city_ids uuid[], other_city_ids uuid[]) ON COMMIT DROP',
        )
        await run(`
          INSERT INTO seed_regions
          SELECT home.region_id, home.city_ids, coalesce(away.city_ids, home.city_ids)
          FROM (
            SELECT region_id, min(province_code) AS province_code, array_agg(city_id) AS city_ids
            FROM seed_cities GROUP BY region_id
          ) AS home
          LEFT JOIN LATERAL (
            SELECT array_agg(city_id) AS city_ids FROM seed_cities
            WHERE province_code = home.province_code AND region_id <> home.region_id
          ) AS away ON true
        `)
        await run(
          'ANALYZE seed_names, seed_cities, seed_skills, seed_city_weights, seed_designations, seed_categories, seed_regions',
        )
      })

      // Every technician is drafted with their home base, hire date, workload and specialties, so the
      // jobs below can be generated straight from this table.
      await step(`drew ${rows(technicianCount)} technicians`, async () => {
        await run(`
          CREATE TEMP TABLE seed_technicians ON COMMIT DROP AS
          WITH draws AS MATERIALIZED (
            SELECT ordinal, ${NAME_DRAWS},
              ${randomInt(1, CITY_WEIGHT_TOTAL)} AS city_rank,
              ${randomInt(1, DESIGNATIONS.length)} AS designation_rank,
              ${randomInt(1, CATEGORY_COUNT)} AS second_category_rank,
              random() AS second_category_pick,
              ${randomInt(...SPECIALTIES_PER_TECHNICIAN)} AS specialty_count
            FROM generate_series(1, ${technicianCount}) AS ordinals(ordinal)
          ),
          crew AS (
            SELECT draws.ordinal, draws.specialty_count,
              ${FULL_NAME} AS name,
              first_names.first_slug || '.' || last_names.last_slug || draws.ordinal || '@fieldservice.example' AS email,
              ${PHONE} AS phone,
              designation.designation, city.city_id, city.region_id,
              current_date - (designation.min_days
                + floor(random() * (designation.max_days - designation.min_days + 1))::int) AS hired_on,
              CASE WHEN random() < ${busyShare}
                THEN 1 + least(floor(random() * ${MAX_ACTIVE_LOAD}), floor(random() * ${MAX_ACTIVE_LOAD}))::int
                ELSE 0
              END AS active_load,
              -- Specialties concentrate in a primary category, rotated so every trade is covered,
              -- plus a second one about half the time.
              primary_category.skill_ids || CASE WHEN draws.second_category_pick < ${SECOND_CATEGORY_PROBABILITY}
                THEN second_category.skill_ids ELSE '{}'::uuid[] END AS pool
            FROM draws
            ${JOIN_NAMES}
            JOIN seed_city_weights home ON home.rank = draws.city_rank
            JOIN seed_cities city ON city.city_id = home.city_id
            JOIN seed_designations designation ON designation.rank = draws.designation_rank
            JOIN seed_categories primary_category ON primary_category.rank = 1 + (draws.ordinal - 1) % ${CATEGORY_COUNT}
            JOIN seed_categories second_category ON second_category.rank = draws.second_category_rank
          )
          SELECT gen_random_uuid() AS id, ordinal, name, email, phone, designation, city_id, region_id,
            hired_on, active_load,
            (
              SELECT array_agg(skill_id) FROM (
                SELECT skill_id FROM (SELECT DISTINCT unnest(crew.pool) AS skill_id) AS candidates
                ORDER BY random() LIMIT crew.specialty_count
              ) AS picked
            ) AS specialty_ids
          FROM crew
        `)
        await run('CREATE UNIQUE INDEX ON seed_technicians (ordinal)')
        await run('ANALYZE seed_technicians')
        await run(`
          INSERT INTO technicians (id, name, email, phone, designation, city_id, hired_on, active_job_count, created_at, updated_at)
          SELECT id, name, email, phone, designation, city_id, hired_on, active_load, now(), now() FROM seed_technicians
        `)
        await run(
          'INSERT INTO technician_skills (technician_id, skill_id) SELECT id, unnest(specialty_ids) FROM seed_technicians',
        )
      })

      // The workloads decide how many assigned jobs there are; the rest of the mix follows from that.
      const [{ assigned }] = await tx.$queryRawUnsafe<{ assigned: number }[]>(
        'SELECT coalesce(sum(active_load), 0)::int AS assigned FROM seed_technicians',
      )
      if (assigned > jobCount) {
        throw new Error(
          `${rows(jobCount)} jobs cannot cover the ${rows(assigned)} assigned jobs of ${rows(technicianCount)} ` +
            'technicians; raise --jobs or lower --technicians.',
        )
      }
      const closed = jobCount - assigned
      const closedShares = COMPLETED_SHARE + OPEN_SHARE + CANCELLED_SHARE
      const completed = Math.round((closed * COMPLETED_SHARE) / closedShares)
      const open = Math.round((closed * OPEN_SHARE) / closedShares)
      const cancelled = closed - completed - open

      await step(`generated ${rows(assigned)} assigned jobs`, () =>
        run(`
          INSERT INTO jobs (${JOB_COLUMNS})
          WITH draws AS MATERIALIZED (
            SELECT technician.id AS technician_id, technician.region_id, technician.specialty_ids,
              ${NAME_DRAWS}, ${HOME_SITE_DRAWS}, ${SPECIALTY_DRAW}, ${TEMPLATE_DRAW}, ${SCHEDULED_SOON_DRAW},
              now() - ${randomMinutes(0, 5 * 24 * 60)} AS assigned_at,
              ${randomMinutes(0, 3 * 24 * 60)} AS logged_before
            FROM seed_technicians AS technician
            CROSS JOIN generate_series(1, technician.active_load)
          )
          SELECT gen_random_uuid(), ${TITLE}, ${DESCRIPTION}, ${FULL_NAME}, ${ADDRESS},
            city.city_id, skill.skill_id, ${PRIORITY}, ${SCHEDULED_SOON}, 'ASSIGNED', draws.technician_id,
            draws.assigned_at, NULL, draws.assigned_at - draws.logged_before, draws.assigned_at
          FROM draws ${JOIN_HOME_SITE} ${JOIN_SPECIALTY} ${JOIN_NAMES}
        `),
      )

      // Closed history: every technician gets an even share of it, spread over their own tenure so that
      // nobody has jobs from before they were hired. Assigned up to a week ahead, completed on the day.
      await step(`generated ${rows(completed)} completed jobs`, () =>
        run(`
          INSERT INTO jobs (${JOB_COLUMNS})
          WITH picks AS MATERIALIZED (
            SELECT ${randomInt(1, technicianCount)} AS ordinal, random() AS history_pick,
              ${NAME_DRAWS}, ${HOME_SITE_DRAWS}, ${SPECIALTY_DRAW}, ${TEMPLATE_DRAW},
              ${randomMinutes(12 * 60, 7 * 24 * 60)} AS lead_time,
              -- 16:00–23:59 UTC is roughly business hours in BC and Alberta.
              ${randomMinutes(16 * 60, 24 * 60 - 1)} AS work_day,
              ${randomMinutes(0, 3 * 24 * 60)} AS logged_before
            FROM generate_series(1, ${completed})
          ),
          draws AS (
            SELECT picks.*, technician.id AS technician_id, technician.region_id, technician.specialty_ids,
              current_date - (1 + floor(picks.history_pick
                * greatest(1, least(${HISTORY_DAYS}, current_date - technician.hired_on - 8)))::int) AS scheduled
            FROM picks JOIN seed_technicians AS technician ON technician.ordinal = picks.ordinal
          )
          SELECT gen_random_uuid(), ${TITLE}, ${DESCRIPTION}, ${FULL_NAME}, ${ADDRESS},
            city.city_id, skill.skill_id, ${PRIORITY}, draws.scheduled, 'COMPLETED', draws.technician_id,
            draws.scheduled - draws.lead_time, draws.scheduled + draws.work_day,
            draws.scheduled - draws.lead_time - draws.logged_before, draws.scheduled + draws.work_day
          FROM draws ${JOIN_HOME_SITE} ${JOIN_SPECIALTY} ${JOIN_NAMES}
        `),
      )

      await step(`generated ${rows(open)} open jobs`, () =>
        run(`
          INSERT INTO jobs (${JOB_COLUMNS})
          WITH draws AS MATERIALIZED (
            SELECT ${NAME_DRAWS}, ${DEMAND_SITE_DRAW}, ${ANY_SPECIALTY_DRAW}, ${TEMPLATE_DRAW}, ${SCHEDULED_SOON_DRAW},
              now() - ${randomMinutes(0, BACKLOG_DAYS * 24 * 60)} AS created_at
            FROM generate_series(1, ${open})
          )
          SELECT gen_random_uuid(), ${TITLE}, ${DESCRIPTION}, ${FULL_NAME}, ${ADDRESS},
            city.city_id, skill.skill_id, ${PRIORITY}, ${SCHEDULED_SOON}, 'OPEN', NULL, NULL, NULL,
            draws.created_at, draws.created_at
          FROM draws ${JOIN_DEMAND_SITE} ${JOIN_ANY_SPECIALTY} ${JOIN_NAMES}
        `),
      )

      // Jobs customers cancelled before anyone was assigned, somewhere in the same three years.
      await step(`generated ${rows(cancelled)} cancelled jobs`, () =>
        run(`
          INSERT INTO jobs (${JOB_COLUMNS})
          WITH draws AS MATERIALIZED (
            SELECT ${NAME_DRAWS}, ${DEMAND_SITE_DRAW}, ${ANY_SPECIALTY_DRAW}, ${TEMPLATE_DRAW},
              current_date - ${randomInt(1, HISTORY_DAYS)} AS cancelled_on,
              ${randomInt(1, 14)} AS scheduled_in,
              ${randomMinutes(24 * 60, 10 * 24 * 60)} AS logged_before,
              ${randomMinutes(16 * 60, 24 * 60 - 1)} AS work_day
            FROM generate_series(1, ${cancelled})
          )
          SELECT gen_random_uuid(), ${TITLE}, ${DESCRIPTION}, ${FULL_NAME}, ${ADDRESS},
            city.city_id, skill.skill_id, ${PRIORITY}, draws.cancelled_on + draws.scheduled_in, 'CANCELLED',
            NULL, NULL, NULL, draws.cancelled_on - draws.logged_before, draws.cancelled_on + draws.work_day
          FROM draws ${JOIN_DEMAND_SITE} ${JOIN_ANY_SPECIALTY} ${JOIN_NAMES}
        `),
      )

      // The counters were written from the same workloads that generated the assigned jobs, so this is
      // a check rather than a backfill: it must find nothing to correct.
      await step('checked the workload counters', async () => {
        const drifted = await recomputeActiveJobCounts(tx)
        if (drifted > 0) throw new Error(`active_job_count was wrong for ${drifted} technicians`)
      })

      return { assigned, completed, open, cancelled }
    },
    { timeout: TRANSACTION_TIMEOUT_MS, maxWait: 60_000 },
  )

  await step('analyzed the tables', () =>
    prisma.$executeRawUnsafe(
      'ANALYZE provinces, regions, cities, skill_categories, skills, technicians, technician_skills, jobs',
    ),
  )

  const busy = await prisma.technician.count({ where: { activeJobCount: { gt: 0 } } })
  const total = jobs.assigned + jobs.completed + jobs.open + jobs.cancelled
  const share = (value: number) => `${((value / total) * 100).toFixed(1)}%`
  console.log(
    `Seeded ${rows(technicianCount)} technicians (${rows(busy)} holding assigned jobs) ` +
      `and ${rows(total)} jobs in ${seconds(startedAt)}: ` +
      `${rows(jobs.completed)} completed (${share(jobs.completed)}), ` +
      `${rows(jobs.assigned)} assigned (${share(jobs.assigned)}), ` +
      `${rows(jobs.open)} open (${share(jobs.open)}) and ` +
      `${rows(jobs.cancelled)} cancelled (${share(jobs.cancelled)}).`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
