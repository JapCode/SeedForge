import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { TopCutBracket } from "../../../domain/entities/TopCutBracket";
import { TournamentId } from "../../../domain/entities/Tournament";
import { TopCutBracketRepository } from "../../../application/ports/TopCutBracketRepository";
import { topCutBrackets } from "../drizzle/schema";
import {
  TopCutBracketMapper,
  SerializedTopCutBracket,
} from "../mappers/TopCutBracketMapper";

export class DrizzleTopCutBracketRepository implements TopCutBracketRepository {
  constructor(private readonly db: NodePgDatabase<Record<string, unknown>>) {}

  async findByTournamentId(
    tournamentId: TournamentId,
  ): Promise<TopCutBracket | null> {
    const rows = await this.db
      .select()
      .from(topCutBrackets)
      .where(eq(topCutBrackets.tournamentId, tournamentId))
      .limit(1);
    if (rows.length === 0) return null;
    return TopCutBracketMapper.toDomain(
      rows[0].data as SerializedTopCutBracket,
    );
  }

  async save(
    tournamentId: TournamentId,
    bracket: TopCutBracket,
  ): Promise<void> {
    const serialized = TopCutBracketMapper.toSerializable(bracket);

    await this.db
      .insert(topCutBrackets)
      .values({
        tournamentId,
        data: serialized,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: topCutBrackets.tournamentId,
        set: {
          data: serialized,
          updatedAt: new Date(),
        },
      });
  }
}
