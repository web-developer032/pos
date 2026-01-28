# Codebase & Plan Analysis

## Summary

- **Plan status:** PostgreSQL + Prisma migration is complete. No remaining plan items.
- **Unused packages:** Several dependencies are not imported anywhere and can be removed.
- **Docs:** Minor stale references (Next.js version, old Turso env) to fix.
- **Optional cleanup:** One legacy script and one sample file can be removed or kept for reference.

---

## 1. Unused Packages (recommend removing)

| Package                      | Reason                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| **baseline-browser-mapping** | Only in `package.json`; no imports in code. Added as dev dep but never used.                          |
| **html5-qrcode**             | No imports in any `.ts`/`.tsx`. Barcode scanning is keyboard-based (`useBarcodeScanner`), not camera. |
| **jspdf**                    | No imports. Receipt uses `react-to-print`, not PDF generation.                                        |
| **jspdf-autotable**          | No imports. No PDF/table export in codebase.                                                          |
| **date-fns-tz**              | No imports. Timezone handling not used; `date-fns` is used for formatting.                            |

**Action:** Remove these from `package.json` and run `pnpm install`.

---

## 2. Packages in Use (verified)

- **@hookform/resolvers**, **react-hook-form** – Forms (ProductForm, CustomerForm, etc.).
- **@prisma/adapter-pg**, **@prisma/client** – DB layer.
- **@reduxjs/toolkit**, **react-redux** – State and RTK Query.
- **bcryptjs** – Password hashing (auth, seed).
- **date-fns** – Date formatting (Receipt, charts, ledger, etc.).
- **dotenv** – Used in `prisma.config.ts` for Prisma CLI.
- **html5-qrcode** – **Not used** (see above).
- **jsbarcode** – Barcode rendering on barcode-generator page (dynamic import).
- **jsonwebtoken**, **@types/jsonwebtoken** – JWT in `lib/auth/auth.ts`.
- **jspdf**, **jspdf-autotable** – **Not used** (see above).
- **react-hot-toast** – Toasts.
- **react-to-print** – Receipt printing.
- **recharts** – Reports and dashboard charts.
- **xlsx** – Excel import in `lib/utils/excel.ts` and ImportExport.
- **zod** – Validation in API routes and forms.

---

## 3. Documentation / Stale References

| File                    | Issue                                                           | Fix                                   |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------- |
| **README.md**           | Says "Next.js 14"                                               | Update to Next.js 16.                 |
| **DOCKER_EXPLAINED.md** | Example `.env` uses `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` | Use `DATABASE_URL` (PostgreSQL) only. |

---

## 4. Optional Cleanup

| Item                            | Notes                                                                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **scripts/migrate-add-unit.ts** | Legacy one-off: adds `products.unit` if missing. Schema already has `ProductUnit` and migrations. Not referenced in scripts or docs. Safe to delete or keep for reference. |
| **products.xlsx**               | Likely sample/template. Not referenced in code. Can remove or keep in repo.                                                                                                |

---

## 5. What’s Left to Implement (from plan)

**Nothing.** The planned work is done:

- PostgreSQL + Prisma as the only DB layer.
- Migrations and seed in place; no LibSQL.
- All routes use Prisma/`sqlQuery`/`sqlExecute`.
- Next 16, React 19, Prisma 7; Docker and docs updated for PostgreSQL.

---

## 6. No Extra or Orphaned Code Found

- All API routes under `app/api/` are backed by RTK Query slices or used by the app.
- `lib/db/init.ts`, `runSeed.ts`, `app/api/init/route.ts` are used (startup seed + manual init).
- `instrumentation.ts` correctly calls `ensureDatabaseInitialized()`.
- No remaining references to LibSQL or Turso in code (only in DOCKER_EXPLAINED.md example).

---

## Recommended Actions

1. **Remove unused packages:** `baseline-browser-mapping`, `html5-qrcode`, `jspdf`, `jspdf-autotable`, `date-fns-tz`.
2. **Update README.md:** Set Next.js version to 16.
3. **Update DOCKER_EXPLAINED.md:** Replace Turso env example with `DATABASE_URL`.
4. **(Optional)** Delete `scripts/migrate-add-unit.ts` and/or `products.xlsx` if you don’t need them.
