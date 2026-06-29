import { describe, it, expect } from "vitest";
import { getResultLabel, calcMatchPoints, calcRanking } from "../scoring";

// ── getResultLabel ────────────────────────────────────────────────────────────

describe("getResultLabel", () => {
  it("returns 1 when home team wins", () => {
    expect(getResultLabel(2, 0)).toBe("1");
    expect(getResultLabel(1, 0)).toBe("1");
  });

  it("returns 2 when away team wins", () => {
    expect(getResultLabel(0, 1)).toBe("2");
    expect(getResultLabel(1, 3)).toBe("2");
  });

  it("returns X on a draw", () => {
    expect(getResultLabel(0, 0)).toBe("X");
    expect(getResultLabel(2, 2)).toBe("X");
  });
});

// ── calcMatchPoints ───────────────────────────────────────────────────────────

describe("calcMatchPoints", () => {
  it("awards 5 points for an exact score hit", () => {
    expect(calcMatchPoints({ g1: 2, g2: 1 }, { g1: 2, g2: 1 })).toBe(5);
    expect(calcMatchPoints({ g1: 0, g2: 0 }, { g1: 0, g2: 0 })).toBe(5);
  });

  it("awards 3 points for correct result label but wrong score", () => {
    expect(calcMatchPoints({ g1: 1, g2: 0 }, { g1: 3, g2: 0 })).toBe(3); // both "1"
    expect(calcMatchPoints({ g1: 0, g2: 2 }, { g1: 1, g2: 3 })).toBe(3); // both "2"
    expect(calcMatchPoints({ g1: 1, g2: 1 }, { g1: 2, g2: 2 })).toBe(3); // both "X"
  });

  it("awards 0 points for wrong result label", () => {
    expect(calcMatchPoints({ g1: 1, g2: 0 }, { g1: 0, g2: 1 })).toBe(0); // predicted 1, got 2
    expect(calcMatchPoints({ g1: 1, g2: 1 }, { g1: 2, g2: 1 })).toBe(0); // predicted X, got 1
    expect(calcMatchPoints({ g1: 0, g2: 1 }, { g1: 0, g2: 0 })).toBe(0); // predicted 2, got X
  });
});

// ── calcRanking ───────────────────────────────────────────────────────────────

describe("calcRanking", () => {
  it("returns empty array when there are no predictions", () => {
    expect(calcRanking({}, { M1: { g1: 1, g2: 0 } })).toEqual([]);
  });

  it("returns zero points when no results have been uploaded", () => {
    const predictions = { Ana: { M1: { g1: 1, g2: 0 } } };
    const [entry] = calcRanking(predictions, {});
    expect(entry.points).toBe(0);
    expect(entry.played).toBe(0);
  });

  it("aggregates points, correct, exact, and played counts correctly", () => {
    const predictions = {
      Ana: {
        M1: { g1: 2, g2: 1 }, // exact  → 5 pts
        M2: { g1: 1, g2: 0 }, // correct (both "1", wrong score) → 3 pts
        M3: { g1: 0, g2: 1 }, // wrong  → 0 pts
      },
    };
    const results = {
      M1: { g1: 2, g2: 1 },
      M2: { g1: 3, g2: 0 },
      M3: { g1: 2, g2: 0 },
    };
    const [entry] = calcRanking(predictions, results);
    expect(entry.points).toBe(8);
    expect(entry.exact).toBe(1);
    expect(entry.correct).toBe(2); // exact also counts as correct
    expect(entry.played).toBe(3);
  });

  it("sorts players by total points descending", () => {
    const predictions = {
      Juan:  { M1: { g1: 1, g2: 0 } }, // 0 pts (wrong result)
      María: { M1: { g1: 2, g2: 1 } }, // 5 pts (exact)
    };
    const results = { M1: { g1: 2, g2: 1 } };
    const ranking = calcRanking(predictions, results);
    expect(ranking[0].name).toBe("María");
    expect(ranking[1].name).toBe("Juan");
  });

  it("breaks ties by number of exact scores", () => {
    const predictions = {
      ConExacto:  { M1: { g1: 2, g2: 1 }, M2: { g1: 0, g2: 0 } }, // 5+5=10pts, 2 exact
      SinExactos: { M1: { g1: 2, g2: 1 }, M2: { g1: 1, g2: 1 } }, // 5+3=8pts, 1 exact
    };
    const results = { M1: { g1: 2, g2: 1 }, M2: { g1: 0, g2: 0 } };
    const ranking = calcRanking(predictions, results);
    expect(ranking[0].name).toBe("ConExacto");
    expect(ranking[0].points).toBe(10);
    expect(ranking[0].exact).toBe(2);
  });

  it("ignores matches that have no result yet", () => {
    const predictions = {
      Ana: {
        M1: { g1: 1, g2: 0 }, // has result
        M2: { g1: 0, g2: 1 }, // no result
      },
    };
    const results = { M1: { g1: 1, g2: 0 } };
    const [entry] = calcRanking(predictions, results);
    expect(entry.played).toBe(1);
    expect(entry.points).toBe(5);
  });
});
