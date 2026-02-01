-- Add user_id to categories (nullable first for backfill)
ALTER TABLE "categories" ADD COLUMN "user_id" INTEGER;

-- Add user_id to suppliers
ALTER TABLE "suppliers" ADD COLUMN "user_id" INTEGER;

-- Add user_id to products
ALTER TABLE "products" ADD COLUMN "user_id" INTEGER;

-- Add user_id to customers
ALTER TABLE "customers" ADD COLUMN "user_id" INTEGER;

-- Add user_id to employees
ALTER TABLE "employees" ADD COLUMN "user_id" INTEGER;

-- Add user_id to discounts
ALTER TABLE "discounts" ADD COLUMN "user_id" INTEGER;

-- Backfill: assign all existing rows to first user (admin)
UPDATE "categories" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1) WHERE "user_id" IS NULL;
UPDATE "suppliers" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1) WHERE "user_id" IS NULL;
UPDATE "products" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1) WHERE "user_id" IS NULL;
UPDATE "customers" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1) WHERE "user_id" IS NULL;
UPDATE "employees" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1) WHERE "user_id" IS NULL;
UPDATE "discounts" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1) WHERE "user_id" IS NULL;

-- Set NOT NULL
ALTER TABLE "categories" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "suppliers" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "employees" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "discounts" ALTER COLUMN "user_id" SET NOT NULL;

-- Add foreign keys
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old unique constraints and add new per-user uniques
DROP INDEX IF EXISTS "categories_name_key";
CREATE UNIQUE INDEX "categories_user_id_name_key" ON "categories"("user_id", "name");

DROP INDEX IF EXISTS "products_barcode_key";
CREATE UNIQUE INDEX "products_user_id_barcode_key" ON "products"("user_id", "barcode");

-- Settings: add id and user_id, then change PK to id and add unique(user_id, key)
ALTER TABLE "settings" ADD COLUMN "id" SERIAL NOT NULL;
ALTER TABLE "settings" ADD COLUMN "user_id" INTEGER;

UPDATE "settings" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1) WHERE "user_id" IS NULL;

ALTER TABLE "settings" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "settings" DROP CONSTRAINT "settings_pkey";
ALTER TABLE "settings" ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "settings_user_id_key_key" ON "settings"("user_id", "key");
