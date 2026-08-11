import { Pool } from "pg";

/**
 * Read-only probe of the real database. Runs once at module load (top-level
 * await) and its result is cached by the module system, so every integration
 * test file that imports `state` sees the same snapshot.
 *
 * It never writes: no migrations, no seeding. It only reports what exists so
 * the test suites can decide whether to run or skip.
 */
export interface DatabaseState {
  /** Could we connect (SELECT 1 succeeded)? */
  dbOk: boolean;
  /** Do all expected tables exist? */
  hasSchema: boolean;
  /** Are there already rows in user/tournaments? */
  hasExistingData: boolean;
  /** Tables that are missing, for a clear failure message. */
  missingTables: string[];
}

const EXPECTED_TABLES = [
  "user",
  "session",
  "account",
  "verification",
  "tournaments",
  "top_cut_brackets",
];

async function probeDatabase(): Promise<DatabaseState> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
  });

  let dbOk = false;
  try {
    await pool.query("SELECT 1");
    dbOk = true;
  } catch {
    dbOk = false;
  }

  let hasSchema = false;
  let hasExistingData = false;
  let missingTables: string[] = [];

  if (dbOk) {
    try {
      const res = await pool.query(
        `SELECT table_name
           FROM information_schema.tables
          WHERE table_schema = 'public'`,
      );
      const present = new Set(res.rows.map((r) => r.table_name));
      missingTables = EXPECTED_TABLES.filter((t) => !present.has(t));
      hasSchema = missingTables.length === 0;
    } catch {
      hasSchema = false;
    }

    if (hasSchema) {
      try {
        const { rows } = await pool.query(
          `SELECT
             (SELECT count(*) FROM "user") AS users,
             (SELECT count(*) FROM tournaments) AS tournaments`,
        );
        hasExistingData =
          Number(rows[0].users) > 0 || Number(rows[0].tournaments) > 0;
      } catch {
        hasExistingData = false;
      }
    }
  }

  await pool.end();

  return { dbOk, hasSchema, hasExistingData, missingTables };
}

export const state: DatabaseState = await probeDatabase();
