import { describe, it, expect } from "vitest";
import { TopCutBracketMapper } from "../TopCutBracketMapper";
import { TopCutBracket } from "../../../../domain/entities/TopCutBracket";

describe("TopCutBracketMapper", () => {
  it("round-trips a freshly created bracket", () => {
    const bracket = TopCutBracket.create(["p1", "p2", "p3", "p4"]);

    const rebuilt = TopCutBracketMapper.toDomain(
      TopCutBracketMapper.toSerializable(bracket),
    );

    expect(rebuilt.getSize()).toBe(4);
    expect(rebuilt.getTotalRounds()).toBe(2);
    expect(rebuilt.getMatch(1, 0).getPlayer1Id()).toBe(
      bracket.getMatch(1, 0).getPlayer1Id(),
    );
  });

  it("survives an actual JSON.stringify/parse cycle with reported winners", () => {
    const bracket = TopCutBracket.create(["p1", "p2", "p3", "p4"]);
    const [match0, match1] = bracket.getRound(1);
    bracket.reportMatchWinner(1, match0.getPosition(), match0.getPlayer1Id()!);
    bracket.reportMatchWinner(1, match1.getPosition(), match1.getPlayer1Id()!);

    const serialized = TopCutBracketMapper.toSerializable(bracket);
    const roundTripped = JSON.parse(JSON.stringify(serialized));
    const rebuilt = TopCutBracketMapper.toDomain(roundTripped);

    expect(rebuilt.getMatch(1, 0).getWinnerId()).toBe(match0.getPlayer1Id());
    const finalMatch = rebuilt.getMatch(2, 0);
    expect(finalMatch.getPlayer1Id()).not.toBeNull();
    expect(finalMatch.getPlayer2Id()).not.toBeNull();
    expect(rebuilt.isComplete()).toBe(false);
  });

  it("preserves the champion once the final is decided", () => {
    const bracket = TopCutBracket.create(["p1", "p2", "p3", "p4"]);
    for (const match of bracket.getRound(1)) {
      bracket.reportMatchWinner(1, match.getPosition(), match.getPlayer1Id()!);
    }
    const finalMatch = bracket.getMatch(2, 0);
    bracket.reportMatchWinner(2, 0, finalMatch.getPlayer1Id()!);

    const rebuilt = TopCutBracketMapper.toDomain(
      TopCutBracketMapper.toSerializable(bracket),
    );

    expect(rebuilt.isComplete()).toBe(true);
    expect(rebuilt.getChampion()).toBe(finalMatch.getPlayer1Id());
  });
});
