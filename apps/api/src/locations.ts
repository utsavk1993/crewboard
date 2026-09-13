import type { Prisma } from './generated/prisma/client'

/** Selects a city with its region and province; map the result through `toLocation`. */
export const locationSelect = {
  id: true,
  name: true,
  region: { select: { id: true, name: true, province: { select: { code: true, name: true } } } },
} satisfies Prisma.CitySelect

type LocationRow = Prisma.CityGetPayload<{ select: typeof locationSelect }>

/** The API shape of a location: `{ city: { id, name }, region: { id, name }, province: { code, name } }`. */
export function toLocation({ id, name, region: { province, ...region } }: LocationRow) {
  return { city: { id, name }, region, province }
}
