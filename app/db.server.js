import { PrismaClient } from "@prisma/client";

// Use singleton pattern to avoid multiple connections
const prisma = global.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

export default prisma;
