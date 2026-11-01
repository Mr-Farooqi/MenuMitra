import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function init() {
  await prisma.platformSetting.upsert({
    where: { key: "BUSINESS_UPI_ID" },
    update: {},
    create: {
      key: "BUSINESS_UPI_ID",
      value: "menumitra@icici",
      description: "Default official UPI VPA for receiving subscription payments",
    },
  });

  await prisma.platformSetting.upsert({
    where: { key: "BUSINESS_UPI_NAME" },
    update: {},
    create: {
      key: "BUSINESS_UPI_NAME",
      value: "MenuMitra SaaS",
      description: "Official Payee Name displayed on UPI scan apps",
    },
  });

  console.log("Platform settings initialized successfully in Neon DB.");
}

init().catch(console.error).finally(() => prisma.$disconnect());
