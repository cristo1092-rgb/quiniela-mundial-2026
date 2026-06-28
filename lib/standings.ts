/**
 * FIFA World Cup 2026 group standings and advancement rules.
 *
 * Tiebreaker order (FIFA rules):
 *  1. Points
 *  2. Goal difference (all group matches)
 *  3. Goals scored (all group matches)
 *  4. Points in head-to-head matches among tied teams
 *  5. Goal difference in head-to-head matches
 *  6. Goals scored in head-to-head matches
 *  7. Alphabetical (proxy for drawing of lots)
 */

import { MATCHES, GROUP_STAGES, Stage } from "./matches";
import { Result } from "./scoring";

export interface TeamStats {
  team: string;
  flag: string;
  group: Stage;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;   // goals for
  ga: number;   // goals against
  gd: number;   // goal difference
  pts: number;
  position?: number; // 1-4 within group
  advances?: "1st" | "2nd" | "3rd-best" | null;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function statsForTeam(
  team: string,
  flag: string,
  group: Stage,
  matchSubset: typeof MATCHES,
  results: Record<string, Result>
): TeamStats {
  const s: TeamStats = { team, flag, group, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };

  for (const match of matchSubset) {
    const result = results[match.id];
    if (!result) continue;

    let gf: number, ga: number;
    if (match.homeTeam === team)       { gf = result.g1; ga = result.g2; }
    else if (match.awayTeam === team)  { gf = result.g2; ga = result.g1; }
    else continue;

    s.played++;
    s.gf += gf;
    s.ga += ga;
    if (gf > ga)      { s.won++;   s.pts += 3; }
    else if (gf === ga){ s.drawn++; s.pts += 1; }
    else               { s.lost++;              }
  }

  s.gd = s.gf - s.ga;
  return s;
}

/** Compare teams using FIFA tiebreakers (lower = better standing). */
function compare(
  a: TeamStats,
  b: TeamStats,
  groupMatches: typeof MATCHES,
  results: Record<string, Result>,
  tiedGroup?: TeamStats[]  // the full set of tied teams for H2H
): number {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.gd  !== a.gd)  return b.gd  - a.gd;
  if (b.gf  !== a.gf)  return b.gf  - a.gf;

  // Head-to-head among tied teams
  const tied = tiedGroup ?? [a, b];
  const tiedNames = new Set(tied.map((t) => t.team));

  const h2hMatches = groupMatches.filter(
    (m) => tiedNames.has(m.homeTeam) && tiedNames.has(m.awayTeam)
  );

  const h2hA = statsForTeam(a.team, a.flag, a.group, h2hMatches, results);
  const h2hB = statsForTeam(b.team, b.flag, b.group, h2hMatches, results);

  if (h2hB.pts !== h2hA.pts) return h2hB.pts - h2hA.pts;
  if (h2hB.gd  !== h2hA.gd)  return h2hB.gd  - h2hA.gd;
  if (h2hB.gf  !== h2hA.gf)  return h2hB.gf  - h2hA.gf;

  // Drawing of lots → alphabetical as deterministic proxy
  return a.team.localeCompare(b.team);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns standings for one group, sorted 1st → 4th. */
export function calcGroupStandings(
  stage: Stage,
  results: Record<string, Result>
): TeamStats[] {
  const groupMatches = MATCHES.filter((m) => m.stage === stage);

  // Collect unique teams
  const teamsMap = new Map<string, string>();
  for (const m of groupMatches) {
    teamsMap.set(m.homeTeam, m.homeFlag);
    teamsMap.set(m.awayTeam, m.awayFlag);
  }

  const raw = Array.from(teamsMap.entries()).map(([team, flag]) =>
    statsForTeam(team, flag, stage, groupMatches, results)
  );

  // Sort with tiebreaker — detect groups of tied teams for H2H
  const sorted = [...raw].sort((a, b) => compare(a, b, groupMatches, results, raw));

  return sorted.map((t, i) => ({ ...t, position: i + 1 }));
}

/** Returns standings for ALL 12 groups. */
export function calcAllStandings(
  results: Record<string, Result>
): Record<Stage, TeamStats[]> {
  const out = {} as Record<Stage, TeamStats[]>;
  for (const stage of GROUP_STAGES) {
    out[stage] = calcGroupStandings(stage, results);
  }
  return out;
}

/**
 * Determines who advances from the group stage.
 * - Top 2 from each group: automatic
 * - Best 8 of the 12 third-place teams: also advance
 */
export function calcAdvancing(
  allStandings: Record<Stage, TeamStats[]>
): {
  advancing: TeamStats[];
  thirdPlace: TeamStats[];      // all 12 third-place teams ranked
  bestThird: TeamStats[];       // top 8 that advance
} {
  const advancing: TeamStats[] = [];
  const thirdPlace: TeamStats[] = [];

  for (const stage of GROUP_STAGES) {
    const standings = allStandings[stage] ?? [];
    if (standings[0]) advancing.push({ ...standings[0], advances: "1st" });
    if (standings[1]) advancing.push({ ...standings[1], advances: "2nd" });
    if (standings[2]) thirdPlace.push({ ...standings[2], advances: null });
  }

  // Rank all 3rd-place teams among themselves (same criteria)
  const ranked3rd = [...thirdPlace].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd  !== a.gd)  return b.gd  - a.gd;
    if (b.gf  !== a.gf)  return b.gf  - a.gf;
    return a.team.localeCompare(b.team);
  });

  const bestThird = ranked3rd.slice(0, 8).map((t) => ({ ...t, advances: "3rd-best" as const }));
  const notAdvancing = ranked3rd.slice(8).map((t) => ({ ...t, advances: null }));

  return {
    advancing: [...advancing, ...bestThird],
    thirdPlace: [...bestThird, ...notAdvancing],
    bestThird,
  };
}

/** How many of the 6 group matches have results loaded. */
export function groupMatchesPlayed(
  stage: Stage,
  results: Record<string, Result>
): number {
  return MATCHES.filter((m) => m.stage === stage && results[m.id]).length;
}

/** True only when ALL 6 matches in the group have a result. */
export function isGroupComplete(stage: Stage, results: Record<string, Result>): boolean {
  return groupMatchesPlayed(stage, results) === 6;
}

// ── R32 bracket auto-fill ─────────────────────────────────────────────────────

/**
 * Maps each R32 match to the correct group positions per the official FIFA 2026 bracket.
 * - 1st/2nd place slots: deterministic once both groups finish.
 * - 3rd-place slots: filled by the best-ranked qualifying 3rd-place team
 *   from a specific set of eligible groups (per FIFA draw rules).
 */
export interface KnockoutSlot {
  matchId: string;
  home: string;
  homeFlag: string;
  away: string;
  awayFlag: string;
  homeLabel: string;
  awayLabel: string;
  ready: boolean; // true = all source groups are complete
}

// pos 0 = 1st place, pos 1 = 2nd place from that group
// eligible = best 3rd-place team from any of these groups (top-8 only when all done)
type Src = { group: Stage; pos: 0 | 1 } | { eligible: Stage[] };

// ── Annex C lookup table (FIFA 2026 World Cup regulations) ─────────────────
// Maps sorted advancing-group letters → 3rd-place slot assignments.
// Slot order (alphabetical by home group): R32_7(A), R32_13(B), R32_10(D),
//   R32_3(E), R32_9(G), R32_6(I), R32_16(K), R32_8(L)
const ANNEX_C_SLOT_IDS = ["R32_7","R32_13","R32_10","R32_3","R32_9","R32_6","R32_16","R32_8"] as const;
const ANNEX_C: Record<string, readonly string[]> = {
  "BDEFIJKL": ["E","J","B","D","I","F","L","K"],
  "BDEFGIKL": ["E","G","B","D","I","F","L","K"],
  "BDEFGIJL": ["E","G","B","D","J","F","L","I"],
  "BDEFGIJK": ["E","G","B","D","J","F","I","K"],
  "ABDEFGIL": ["E","G","B","D","A","F","L","I"],
  "ABDEFGIK": ["E","G","B","D","A","F","I","K"],
  "ABDEFGIJ": ["E","G","B","D","A","F","I","J"],
  "ABCDEFGI": ["C","G","B","D","A","F","E","I"],
};

/** Looks up the Annex C slot→group mapping for the actual top-8 advancing 3rd-place teams. */
function lookupAnnexC(bestThird: TeamStats[]): Record<string, Stage> | null {
  if (bestThird.length !== 8) return null;
  const key = bestThird.map(t => t.group.slice(-1).toUpperCase()).sort().join("");
  const groups = ANNEX_C[key];
  if (!groups) return null;
  return Object.fromEntries(
    ANNEX_C_SLOT_IDS.map((matchId, i) => [matchId, `group${groups[i]}` as Stage])
  );
}

const R32_MAP: Array<{ matchId: string; home: Src; away: Src; homeLabel: string; awayLabel: string }> = [
  // M73 (Jun 28): 2A vs 2B
  { matchId: "R32_1",  home: { group: "groupA", pos: 1 }, away: { group: "groupB", pos: 1 }, homeLabel: "2A",     awayLabel: "2B" },
  // M76 (Jun 29): 1C vs 2F
  { matchId: "R32_2",  home: { group: "groupC", pos: 0 }, away: { group: "groupF", pos: 1 }, homeLabel: "1C",     awayLabel: "2F" },
  // M74 (Jun 29): 1E vs 3°(A/B/C/D/F)
  { matchId: "R32_3",  home: { group: "groupE", pos: 0 }, away: { eligible: ["groupA","groupB","groupC","groupD","groupF"] }, homeLabel: "1E", awayLabel: "3ABCDF" },
  // M75 (Jun 29): 1F vs 2C
  { matchId: "R32_4",  home: { group: "groupF", pos: 0 }, away: { group: "groupC", pos: 1 }, homeLabel: "1F",     awayLabel: "2C" },
  // M78 (Jun 30): 2E vs 2I
  { matchId: "R32_5",  home: { group: "groupE", pos: 1 }, away: { group: "groupI", pos: 1 }, homeLabel: "2E",     awayLabel: "2I" },
  // M77 (Jun 30): 1I vs 3°(C/D/F/G/H)
  { matchId: "R32_6",  home: { group: "groupI", pos: 0 }, away: { eligible: ["groupC","groupD","groupF","groupG","groupH"] }, homeLabel: "1I", awayLabel: "3CDFGH" },
  // M79 (Jun 30): 1A vs 3°(C/E/F/H/I)
  { matchId: "R32_7",  home: { group: "groupA", pos: 0 }, away: { eligible: ["groupC","groupE","groupF","groupH","groupI"] }, homeLabel: "1A", awayLabel: "3CEFHI" },
  // M80 (Jul 1): 1L vs 3°(E/H/I/J/K)
  { matchId: "R32_8",  home: { group: "groupL", pos: 0 }, away: { eligible: ["groupE","groupH","groupI","groupJ","groupK"] }, homeLabel: "1L", awayLabel: "3EHIJK" },
  // M82 (Jul 1): 1G vs 3°(A/E/H/I/J)
  { matchId: "R32_9",  home: { group: "groupG", pos: 0 }, away: { eligible: ["groupA","groupE","groupH","groupI","groupJ"] }, homeLabel: "1G", awayLabel: "3AEHIJ" },
  // M81 (Jul 1): 1D vs 3°(B/E/F/I/J)
  { matchId: "R32_10", home: { group: "groupD", pos: 0 }, away: { eligible: ["groupB","groupE","groupF","groupI","groupJ"] }, homeLabel: "1D", awayLabel: "3BEFIJ" },
  // M84 (Jul 2): 1H vs 2J
  { matchId: "R32_11", home: { group: "groupH", pos: 0 }, away: { group: "groupJ", pos: 1 }, homeLabel: "1H",     awayLabel: "2J" },
  // M83 (Jul 2): 2K vs 2L
  { matchId: "R32_12", home: { group: "groupK", pos: 1 }, away: { group: "groupL", pos: 1 }, homeLabel: "2K",     awayLabel: "2L" },
  // M85 (Jul 2): 1B vs 3°(E/F/G/I/J)
  { matchId: "R32_13", home: { group: "groupB", pos: 0 }, away: { eligible: ["groupE","groupF","groupG","groupI","groupJ"] }, homeLabel: "1B", awayLabel: "3EFGIJ" },
  // M88 (Jul 3): 2D vs 2G
  { matchId: "R32_14", home: { group: "groupD", pos: 1 }, away: { group: "groupG", pos: 1 }, homeLabel: "2D",     awayLabel: "2G" },
  // M86 (Jul 3): 1J vs 2H
  { matchId: "R32_15", home: { group: "groupJ", pos: 0 }, away: { group: "groupH", pos: 1 }, homeLabel: "1J",     awayLabel: "2H" },
  // M87 (Jul 3): 1K vs 3°(D/E/I/J/L)
  { matchId: "R32_16", home: { group: "groupK", pos: 0 }, away: { eligible: ["groupD","groupE","groupI","groupJ","groupL"] }, homeLabel: "1K", awayLabel: "3DEIJL" },
];

function resolveTeam(
  src: Src,
  allStandings: Record<Stage, TeamStats[]>,
  bestThird: TeamStats[],
  annexCMap: Record<string, Stage> | null,
  matchId: string,
): { name: string; flag: string } | null {
  if ("eligible" in src) {
    // 3rd-place slots: only show a team when Annex C gives a definitive answer
    // (i.e., all groups complete and combination is in the table).
    if (!annexCMap) return null;
    const targetGroup = annexCMap[matchId] as Stage | undefined;
    const team = targetGroup ? bestThird.find(t => t.group === targetGroup) : null;
    return team ? { name: team.team, flag: team.flag } : null;
  }
  const team = allStandings[src.group]?.[src.pos];
  return team ? { name: team.team, flag: team.flag } : null;
}

export function computeAutoKnockoutTeams(
  results: Record<string, Result>,
  knockoutWinners: Record<string, "home" | "away"> = {}
): { teams: Record<string, string>; provisional: Set<string> } {
  const teams: Record<string, string> = {};
  const provisional = new Set<string>();

  // R32: from group standings — include provisional (incomplete groups) for display
  const allStandings = calcAllStandings(results);
  for (const slot of getR32Assignments(allStandings, results)) {
    if (slot.home === "TBD" && slot.away === "TBD") continue; // no results yet
    teams[`${slot.matchId}_home`]     = slot.home;
    teams[`${slot.matchId}_away`]     = slot.away;
    teams[`${slot.matchId}_homeFlag`] = slot.homeFlag;
    teams[`${slot.matchId}_awayFlag`] = slot.awayFlag;
    if (!slot.ready) provisional.add(slot.matchId); // group not finished → tentativo
  }

  // R16 → Final: from previous round results + knockoutWinners for penalty cases
  const re = /^(G|Perdedor) ([A-Z0-9]+)-(\d+)$/;
  for (const match of MATCHES) {
    for (const side of ["home", "away"] as const) {
      const label = side === "home" ? match.homeLabel : match.awayLabel;
      if (!label) continue;
      const m = label.match(re);
      if (!m) continue;

      const [, type, prefix, num] = m;
      const srcId = prefix.length > 2 ? `${prefix}_${num}` : `${prefix}${num}`;
      const res = results[srcId];
      if (!res) continue;

      let winnerSide: "home" | "away" | null = null;
      if (res.g1 !== res.g2) {
        winnerSide = res.g1 > res.g2 ? "home" : "away";
      } else if (knockoutWinners[srcId]) {
        winnerSide = knockoutWinners[srcId];
      }
      if (!winnerSide) continue;

      const wantWinner = type === "G";
      const teamKey = wantWinner ? winnerSide : (winnerSide === "home" ? "away" : "home");

      const name = teams[`${srcId}_${teamKey}`];
      const flag = teams[`${srcId}_${teamKey}Flag`];
      if (!name) continue;

      teams[`${match.id}_${side}`]     = name;
      teams[`${match.id}_${side}Flag`] = flag;
      if (provisional.has(srcId)) provisional.add(match.id); // inherit provisional status
    }
  }

  return { teams, provisional };
}

/** Returns all 3^n possible outcomes for n remaining matches. */
function enumerateOutcomes(n: number): Array<Array<{ g1: number; g2: number }>> {
  if (n === 0) return [[]];
  const BASE = [{ g1: 1, g2: 0 }, { g1: 1, g2: 1 }, { g1: 0, g2: 1 }] as const;
  return BASE.flatMap((o) => enumerateOutcomes(n - 1).map((r) => [o, ...r]));
}

/**
 * Returns true only when every possible outcome of the remaining group matches
 * produces the same team in `pos` (0 = 1st, 1 = 2nd).
 * This lets knockout slots open early without waiting for all 6 group games.
 */
function isPositionConfirmed(
  stage: Stage,
  pos: 0 | 1,
  results: Record<string, Result>
): boolean {
  const groupMatches = MATCHES.filter((m) => m.stage === stage);
  const remaining = groupMatches.filter((m) => !results[m.id]);
  if (remaining.length === 0) return true;
  const seen = new Set<string>();
  for (const outcome of enumerateOutcomes(remaining.length)) {
    const sim = { ...results };
    remaining.forEach((m, i) => { sim[m.id] = outcome[i]; });
    const team = calcGroupStandings(stage, sim)[pos]?.team ?? "";
    seen.add(team);
    if (seen.size > 1) return false; // ambiguous → not confirmed yet
  }
  return seen.size === 1 && !seen.has("");
}

/**
 * Enumerates all possible outcomes of remaining group matches and returns,
 * for each 3rd-place R32 slot (by its index in R32_MAP), the set of team
 * names that could fill it. A set of size 1 means the slot is confirmed.
 */
function computeThirdPlaceVariants(
  results: Record<string, Result>
): Map<number, Set<string>> {
  const variantsByIndex = new Map<number, Set<string>>();

  const allGroupMatches = MATCHES.filter((m) =>
    GROUP_STAGES.includes(m.stage as typeof GROUP_STAGES[number])
  );
  const remaining = allGroupMatches.filter((m) => !results[m.id]);

  const simulate = (simResults: Record<string, Result>) => {
    const standings = calcAllStandings(simResults);
    const { bestThird } = calcAdvancing(standings);
    const annexCMap = lookupAnnexC(bestThird);
    R32_MAP.forEach((slot, i) => {
      const src = "eligible" in slot.away
        ? slot.away
        : "eligible" in slot.home
        ? slot.home
        : null;
      if (!src) return;
      if (!variantsByIndex.has(i)) variantsByIndex.set(i, new Set());
      if (annexCMap) {
        const targetGroup = annexCMap[slot.matchId] as Stage | undefined;
        const team = targetGroup ? bestThird.find(t => t.group === targetGroup) : null;
        variantsByIndex.get(i)!.add(team?.team ?? "");
      } else {
        variantsByIndex.get(i)!.add(""); // unknown combination → sentinel
      }
    });
  };

  // Only confirm 3rd-place slots when ALL group results are uploaded.
  // Enumeration of partial results produces false positives because J/K/L
  // 3rd-place teams can displace eligible teams from the top-8 ranking,
  // and that interaction only stabilises once the full picture is known.
  if (remaining.length === 0) {
    simulate(results);
  }

  return variantsByIndex;
}

export function getR32Assignments(
  allStandings: Record<Stage, TeamStats[]>,
  results: Record<string, Result>
): KnockoutSlot[] {
  const { bestThird } = calcAdvancing(allStandings);
  const allGroupsComplete = GROUP_STAGES.every((s) => isGroupComplete(s, results));
  const annexCMap = allGroupsComplete ? lookupAnnexC(bestThird) : null;
  const thirdVariants = computeThirdPlaceVariants(results);

  return R32_MAP.map(({ matchId, home, away, homeLabel, awayLabel }, mapIndex) => {
    const hasThird = "eligible" in home || "eligible" in away;
    let ready = false;
    if (hasThird) {
      const variants = thirdVariants.get(mapIndex);
      ready = variants !== undefined && variants.size === 1 && !variants.has("");
    } else {
      const hSrc = home as { group: Stage; pos: 0 | 1 };
      const aSrc = away as { group: Stage; pos: 0 | 1 };
      ready = isPositionConfirmed(hSrc.group, hSrc.pos, results) &&
              isPositionConfirmed(aSrc.group, aSrc.pos, results);
    }

    const h = resolveTeam(home, allStandings, bestThird, annexCMap, matchId);
    const a = resolveTeam(away, allStandings, bestThird, annexCMap, matchId);

    return {
      matchId,
      home: h?.name ?? "TBD",
      homeFlag: h?.flag ?? "🏳️",
      away: a?.name ?? "TBD",
      awayFlag: a?.flag ?? "🏳️",
      homeLabel,
      awayLabel,
      ready,
    };
  });
}
