import { Pool, types } from "pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// pg returns JSON/JSONB columns as strings by default; parse them so Prisma Json fields
// arrive as JavaScript objects rather than raw strings.
types.setTypeParser(114, JSON.parse);   // json
types.setTypeParser(3802, JSON.parse);  // jsonb

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    connectionTimeoutMillis: 30_000,
    max: 5,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
