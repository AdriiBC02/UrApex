import type { Car, CarClass } from "@prisma/client"
import { db } from "@/lib/db"

export async function findOrCreateCar(
  rawName: string,
  simulatorId: string
): Promise<Car> {
  // 1. Exact alias match
  const alias = await db.carAlias.findUnique({
    where: { rawName_simulatorId: { rawName, simulatorId } },
    include: { car: true },
  })
  if (alias) return alias.car

  // 2. Slug match
  const slug = toCarSlug(rawName)
  const existing = await db.car.findUnique({ where: { slug } })

  if (existing) {
    await db.carAlias.create({ data: { carId: existing.id, rawName, simulatorId } })
    return existing
  }

  // 3. Create new car + alias
  return db.car.create({
    data: {
      slug,
      name: rawName,
      simulatorId,
      aliases: { create: { rawName, simulatorId } },
    },
  })
}

export async function findOrCreateCarClass(
  rawName: string,
  simulatorId: string | null
): Promise<CarClass> {
  const slug = toCarSlug(rawName)

  const existing = await db.carClass.findUnique({
    where: { slug_simulatorId: { slug, simulatorId: simulatorId ?? "" } },
  })
  if (existing) return existing

  return db.carClass.create({
    data: { slug, name: rawName, simulatorId },
  })
}

function toCarSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-+|-+$/g, "")
}
