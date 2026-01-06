import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  await prisma.application.create({
    data: {
      id: randomUUID(),
      name: "Demo App",
      slug: "demo-app",
      apiKey: "super-secret-key-123",
      isActive: true,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
