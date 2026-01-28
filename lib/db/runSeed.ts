import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function runSeed(): Promise<void> {
  const existingAdmin = await prisma.user.findUnique({
    where: { username: "admin" },
  });

  if (existingAdmin) {
    return;
  }

  console.log("[DB] Seeding database with default data...");

  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    create: {
      username: "admin",
      email: "admin@pos.com",
      passwordHash,
      role: "admin",
    },
    update: {},
  });

  const categories = [
    { name: "Other", description: "Default category for uncategorized items" },
    { name: "Electronics", description: "Electronic items" },
    { name: "Food & Beverages", description: "Food and drink items" },
    { name: "Clothing", description: "Clothing and apparel" },
    { name: "Home & Kitchen", description: "Home and kitchen items" },
    { name: "Health & Beauty", description: "Health and beauty products" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      create: category,
      update: {},
    });
  }

  const existingSupplier = await prisma.supplier.findFirst({
    where: { name: "Other" },
  });
  if (!existingSupplier) {
    await prisma.supplier.create({
      data: {
        name: "Other",
        contactPerson: "Default Supplier",
        email: "other@pos.com",
      },
    });
  }

  const settings = [
    { key: "store_name", value: "Super Store" },
    { key: "tax_rate", value: "10" },
    { key: "currency", value: "USD" },
    { key: "currency_symbol", value: "$" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      create: setting,
      update: { value: setting.value },
    });
  }

  console.log("[DB] Seeding complete");
}
