export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize database when server starts
    const { ensureDatabaseInitialized } = await import("./lib/db/init");
    try {
      await ensureDatabaseInitialized();
      console.log("[DB] Database initialized on server startup");
    } catch (error) {
      console.error("[DB] Failed to initialize database on startup:", error);
    }
  }
}
