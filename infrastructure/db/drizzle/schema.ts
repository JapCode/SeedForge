import {
  pgTable,
  text,
  jsonb,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { user } from "../../auth/auth-schema";

/**
 * Each row is one Tournament aggregate. `data` holds the full serialized
 * aggregate (players, rounds, matches, ruleset, phase, etc.) produced by
 * TournamentMapper — the aggregate is always read/written as a whole, so a
 * single jsonb column avoids mapping 4+ relational tables for something
 * that's never queried piecemeal. ownerId and shareToken are pulled out as
 * real columns because those two ARE queried directly (list-my-tournaments,
 * resolve-by-share-link).
 *
 * `version` supports optimistic concurrency control: every save() must
 * match the version it was loaded at, or it's rejected — see
 * DrizzleTournamentRepository. This matters because match results can come
 * in from several tables concurrently, and a naive overwrite could silently
 * drop one of them.
 */
export const tournaments = pgTable(
  "tournaments",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    shareToken: text("share_token").unique(),
    data: jsonb("data").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    ownerIdIdx: index("tournaments_owner_id_idx").on(table.ownerId),
  }),
);

/**
 * The Top Cut bracket is a separate aggregate from Tournament (see
 * TopCutBracketRepository), keyed 1:1 by tournamentId.
 */
export const topCutBrackets = pgTable("top_cut_brackets", {
  tournamentId: text("tournament_id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
