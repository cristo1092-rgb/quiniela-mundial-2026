import { describe, it, expect } from "vitest";
import {
  calcGroupStandings,
  calcAllStandings,
  calcAdvancing,
  isGroupComplete,
  getR32Assignments,
  computeAutoKnockoutTeams,
} from "../standings";
import type { Result } from "../scoring";

// ── Group A: México, Sudáfrica, Corea del Sur, Chequia ───────────────────────
// Match ids: A1 A2 A3 A4 A5 A6

const COMPLETE_A: Record<string, Result> = {
  A1: { g1: 3, g2: 0 }, // México 3–0 Sudáfrica
  A2: { g1: 1, g2: 2 }, // Corea del Sur 1–2 Chequia
  A3: { g1: 0, g2: 2 }, // Chequia 0–2 Sudáfrica
  A4: { g1: 2, g2: 1 }, // México 2–1 Corea del Sur
  A5: { g1: 1, g2: 0 }, // México 1–0 Chequia
  A6: { g1: 1, g2: 2 }, // Corea del Sur 1–2 Sudáfrica
};
// Expected: México 9pts(W3), Sudáfrica 6pts(W2), Chequia 3pts(W1,L2), Corea del Sur 0pts(L3)

// ── isGroupComplete ───────────────────────────────────────────────────────────

describe("isGroupComplete", () => {
  it("returns false when no results have been uploaded", () => {
    expect(isGroupComplete("groupA", {})).toBe(false);
  });

  it("returns false when only some matches have results", () => {
    expect(isGroupComplete("groupA", { A1: { g1: 1, g2: 0 } })).toBe(false);
  });

  it("returns true when all 6 matches in the group have results", () => {
    expect(isGroupComplete("groupA", COMPLETE_A)).toBe(true);
  });
});

// ── calcGroupStandings ────────────────────────────────────────────────────────

describe("calcGroupStandings", () => {
  it("returns 4 teams sorted by points when group is complete", () => {
    const standings = calcGroupStandings("groupA", COMPLETE_A);
    expect(standings).toHaveLength(4);
    expect(standings[0].team).toBe("México");       // 9 pts
    expect(standings[1].team).toBe("Sudáfrica");    // 6 pts
    expect(standings[2].team).toBe("Chequia");      // 3 pts
    expect(standings[3].team).toBe("Corea del Sur");// 0 pts
  });

  it("assigns correct points, goals, and position fields", () => {
    const standings = calcGroupStandings("groupA", COMPLETE_A);
    const mx = standings[0];
    expect(mx.pts).toBe(9);
    expect(mx.won).toBe(3);
    expect(mx.drawn).toBe(0);
    expect(mx.lost).toBe(0);
    expect(mx.gf).toBe(6);   // 3+2+1
    expect(mx.ga).toBe(1);   // 0+1+0
    expect(mx.gd).toBe(5);
    expect(mx.played).toBe(3);
    expect(mx.position).toBe(1);
  });

  it("all teams start at 0 pts when no results uploaded", () => {
    const standings = calcGroupStandings("groupA", {});
    for (const t of standings) {
      expect(t.pts).toBe(0);
      expect(t.played).toBe(0);
    }
  });

  it("breaks ties by goal difference when two teams have equal points", () => {
    // Chequia and México both reach 6pts, broken by GD (+3 vs 0)
    // A1: México 1-0 Sudáfrica → México W(3pts, GD+1)
    // A2: Corea del Sur 0-3 Chequia → Chequia W(3pts, GD+3)
    // A3: Chequia 2-0 Sudáfrica → Chequia W(6pts, GD+5)
    // A4: México 0-3 Corea del Sur → Corea W(3pts), México L(GD+1-3=-2... wait 1-0-3=-2? No: GF=1+0=1 GA=0+3=3 → GD=-2)
    // A5: México 2-0 Chequia → México W(6pts), Chequia GF=5,GA=2,GD=+3 (loses 0-2: GF+0 GA+2 → GF total 5,GA=2)
    // A6: Corea del Sur 0-0 Sudáfrica → both D
    //
    // Final totals:
    // Chequia: W(A2) W(A3) L(A5) → 6pts, GF=5, GA=2, GD=+3
    // México:  W(A1) L(A4) W(A5) → 6pts, GF=3, GA=3, GD=0
    // Corea:   L(A2) W(A4) D(A6) → 4pts
    // Sudáfrica: L(A1) L(A3) D(A6) → 1pt
    const r: Record<string, Result> = {
      A1: { g1: 1, g2: 0 }, // México 1–0 Sudáfrica
      A2: { g1: 0, g2: 3 }, // Corea del Sur 0–3 Chequia
      A3: { g1: 2, g2: 0 }, // Chequia 2–0 Sudáfrica
      A4: { g1: 0, g2: 3 }, // México 0–3 Corea del Sur
      A5: { g1: 2, g2: 0 }, // México 2–0 Chequia
      A6: { g1: 0, g2: 0 }, // Corea del Sur 0–0 Sudáfrica
    };
    const standings = calcGroupStandings("groupA", r);
    // Both Chequia and México have 6pts; Chequia wins on GD (+3 vs 0)
    expect(standings[0].team).toBe("Chequia");  // 6pts, GD+3
    expect(standings[1].team).toBe("México");   // 6pts, GD=0
    expect(standings[2].team).toBe("Corea del Sur"); // 4pts
    expect(standings[3].team).toBe("Sudáfrica");     // 1pt
  });
});

// ── calcAdvancing ─────────────────────────────────────────────────────────────

describe("calcAdvancing", () => {
  it("includes 1st and 2nd from each group", () => {
    const allResults: Record<string, Result> = { ...COMPLETE_A };
    // Add minimal results for the remaining 11 groups (B–L) so we get 12 3rd-place teams.
    // Only group A is tested in detail; others just need results to populate standings.
    const OTHER_GROUPS = [
      ["B1","B2","B3","B4","B5","B6"],
      ["C1","C2","C3","C4","C5","C6"],
      ["D1","D2","D3","D4","D5","D6"],
      ["E1","E2","E3","E4","E5","E6"],
      ["F1","F2","F3","F4","F5","F6"],
      ["G1","G2","G3","G4","G5","G6"],
      ["H1","H2","H3","H4","H5","H6"],
      ["I1","I2","I3","I4","I5","I6"],
      ["J1","J2","J3","J4","J5","J6"],
      ["K1","K2","K3","K4","K5","K6"],
      ["L1","L2","L3","L4","L5","L6"],
    ];
    for (const group of OTHER_GROUPS) {
      // Simple round-robin where home always wins 1-0
      for (const id of group) allResults[id] = { g1: 1, g2: 0 };
    }

    const allStandings = calcAllStandings(allResults);
    const { advancing, bestThird } = calcAdvancing(allStandings);

    // 12 groups × 2 = 24 advancing 1st/2nd + 8 best 3rd = 32 teams
    expect(advancing).toHaveLength(32);
    expect(bestThird).toHaveLength(8);

    // México is 1st in group A
    const mxEntry = advancing.find((t) => t.team === "México");
    expect(mxEntry?.advances).toBe("1st");
    expect(mxEntry?.group).toBe("groupA");

    const saEntry = advancing.find((t) => t.team === "Sudáfrica");
    expect(saEntry?.advances).toBe("2nd");
  });
});

// ── getR32Assignments ─────────────────────────────────────────────────────────

describe("getR32Assignments", () => {
  it("returns 16 slots regardless of results", () => {
    const allStandings = calcAllStandings({});
    const slots = getR32Assignments(allStandings, {});
    expect(slots).toHaveLength(16);
  });

  it("marks 1st/2nd slots as not ready when groups are incomplete", () => {
    const results = { A1: { g1: 1, g2: 0 } };
    const allStandings = calcAllStandings(results);
    const slots = getR32Assignments(allStandings, results);
    // R32_1 is "2A vs 2B" — neither group A nor B is complete
    const r32_1 = slots.find((s) => s.matchId === "R32_1");
    expect(r32_1?.ready).toBe(false);
  });

  it("marks 1st/2nd slots as ready when both source groups are complete", () => {
    const fullResults: Record<string, Result> = {};
    // Complete groups A and B (any scores)
    for (const id of ["A1","A2","A3","A4","A5","A6","B1","B2","B3","B4","B5","B6"]) {
      fullResults[id] = { g1: 1, g2: 0 };
    }
    const allStandings = calcAllStandings(fullResults);
    const slots = getR32Assignments(allStandings, fullResults);
    // R32_1 = 2A vs 2B — both groups now complete
    const r32_1 = slots.find((s) => s.matchId === "R32_1");
    expect(r32_1?.ready).toBe(true);
  });

  it("resolves team names for completed 1st/2nd slots", () => {
    const fullResults: Record<string, Result> = {};
    // México wins group A (9pts), Canadá wins group B (9pts)
    // Group A: México wins all 3
    fullResults["A1"] = { g1: 1, g2: 0 }; // México def. Sudáfrica
    fullResults["A2"] = { g1: 0, g2: 1 }; // Corea del Sur 0–1 Chequia (2nd: Chequia?)
    fullResults["A3"] = { g1: 1, g2: 0 }; // Chequia def. Sudáfrica
    fullResults["A4"] = { g1: 1, g2: 0 }; // México def. Corea del Sur
    fullResults["A5"] = { g1: 1, g2: 0 }; // México def. Chequia
    fullResults["A6"] = { g1: 0, g2: 1 }; // Corea del Sur 0–1 Sudáfrica

    // Group B: Canadá wins all 3
    fullResults["B1"] = { g1: 1, g2: 0 }; // Canadá def. Bosnia-Herzegovina
    fullResults["B2"] = { g1: 0, g2: 1 }; // Qatar 0–1 Suiza
    fullResults["B3"] = { g1: 1, g2: 0 }; // Suiza def. Bosnia-Herzegovina
    fullResults["B4"] = { g1: 1, g2: 0 }; // Canadá def. Qatar
    fullResults["B5"] = { g1: 1, g2: 0 }; // Suiza def. Canadá → Canadá loses but still 6pts, Suiza 6pts
    fullResults["B6"] = { g1: 1, g2: 0 }; // Bosnia-Herzegovina def. Qatar

    const allStandings = calcAllStandings(fullResults);
    const slots = getR32Assignments(allStandings, fullResults);

    // R32_1 = 2A vs 2B
    const r32_1 = slots.find((s) => s.matchId === "R32_1");
    expect(r32_1?.home).not.toBe("TBD");
    expect(r32_1?.away).not.toBe("TBD");
  });

  it("shows TBD for a 3rd-place slot when not enough groups are done", () => {
    const allStandings = calcAllStandings({});
    const slots = getR32Assignments(allStandings, {});
    // All 3rd-place slots should be TBD with no results
    const thirdSlots = slots.filter((s) => s.awayLabel.startsWith("3"));
    expect(thirdSlots.every((s) => s.away === "TBD")).toBe(true);
  });
});

// ── computeAutoKnockoutTeams ──────────────────────────────────────────────────

describe("computeAutoKnockoutTeams", () => {
  it("marks all R32 slots provisional when no results have been uploaded", () => {
    // The function always fills team names from current standings (even partial),
    // but marks all slots provisional when groups aren't complete.
    const { provisional } = computeAutoKnockoutTeams({});
    // R32_1 depends on groups A and B — both incomplete
    expect(provisional.has("R32_1")).toBe(true);
  });

  it("propagates group-stage winners into R32 slot names once groups complete", () => {
    const fullResults: Record<string, Result> = {};
    // Complete all 12 groups with home always winning 1-0
    const groupLetters = ["A","B","C","D","E","F","G","H","I","J","K","L"];
    for (const g of groupLetters) {
      for (let i = 1; i <= 6; i++) fullResults[`${g}${i}`] = { g1: 1, g2: 0 };
    }

    const { teams, provisional } = computeAutoKnockoutTeams(fullResults);

    // R32_1 = 2A vs 2B — should be resolved (not TBD) now that both groups are done
    expect(teams["R32_1_home"]).toBeDefined();
    expect(teams["R32_1_away"]).toBeDefined();
    expect(teams["R32_1_home"]).not.toBe("TBD");
    expect(teams["R32_1_away"]).not.toBe("TBD");

    // All R32 slots should be out of provisional
    expect(provisional.has("R32_1")).toBe(false);
  });

  it("marks R32 slots provisional when source group is still playing", () => {
    // Only 5 of 6 group A matches done — group not complete
    const partialA: Record<string, Result> = {
      A1: { g1: 1, g2: 0 },
      A2: { g1: 1, g2: 0 },
      A3: { g1: 1, g2: 0 },
      A4: { g1: 1, g2: 0 },
      A5: { g1: 1, g2: 0 },
      // A6 missing
    };
    const { provisional } = computeAutoKnockoutTeams(partialA);
    // R32_1 sources from groupA (home) and groupB (away); groupA not complete
    expect(provisional.has("R32_1")).toBe(true);
  });

  it("uses knockoutWinners to advance the right team on a penalty draw", () => {
    const fullResults: Record<string, Result> = {};
    const groupLetters = ["A","B","C","D","E","F","G","H","I","J","K","L"];
    for (const g of groupLetters) {
      for (let i = 1; i <= 6; i++) fullResults[`${g}${i}`] = { g1: 1, g2: 0 };
    }
    // R32_1 match ends 1-1 draw
    fullResults["R32_1"] = { g1: 1, g2: 1 };

    // Without a declared winner, R16 slots depending on R32_1 should stay unresolved
    const { teams: teamsNoWinner } = computeAutoKnockoutTeams(fullResults);
    // R16_1 home comes from winner of R32_1 — can't be resolved without knockoutWinners
    expect(teamsNoWinner["R16_1_home"]).toBeUndefined();

    // Declare the home team as winner via penalties
    const { teams: teamsWithWinner } = computeAutoKnockoutTeams(
      fullResults,
      { "R32_1": "home" }
    );
    expect(teamsWithWinner["R16_1_home"]).toBeDefined();
  });
});
