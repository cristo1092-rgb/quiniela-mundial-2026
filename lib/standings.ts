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
 * Maps each R32 match slot to who should play based on group standings.
 * R32_1-12 are determined by group 1st/2nd place finishers.
 * R32_13-16 use the 8 best 3rd-place teams (seeded by rank).
 *
 * Only returns slots where BOTH groups involved are complete.
 */
export interface KnockoutSlot {
  matchId: string;
  home: string;
  homeFlag: string;
  away: string;
  awayFlag: string;
  homeLabel: string;
  awayLabel: string;
  ready: boolean; // true = both groups complete
}

// Bracket: [matchId, homeSrc, awaySrc]
// homeSrc/awaySrc = { group, pos } where pos 0=1st, 1=2nd, 2=3rd
type Src = { group: Stage; pos: 0 | 1 } | { third: number }; // third = rank among best 3rd (0-7)

const R32_MAP: Array<{ matchId: string; home: Src; away: Src; homeLabel: string; awayLabel: string }> = [
  { matchId: "R32_1",  home: { group: "groupA", pos: 0 }, away: { group: "groupC", pos: 1 }, homeLabel: "1A", awayLabel: "2C" },
  { matchId: "R32_2",  home: { group: "groupB", pos: 0 }, away: { group: "groupD", pos: 1 }, homeLabel: "1B", awayLabel: "2D" },
  { matchId: "R32_3",  home: { group: "groupC", pos: 0 }, away: { group: "groupA", pos: 1 }, homeLabel: "1C", awayLabel: "2A" },
  { matchId: "R32_4",  home: { group: "groupD", pos: 0 }, away: { group: "groupB", pos: 1 }, homeLabel: "1D", awayLabel: "2B" },
  { matchId: "R32_5",  home: { group: "groupE", pos: 0 }, away: { group: "groupG", pos: 1 }, homeLabel: "1E", awayLabel: "2G" },
  { matchId: "R32_6",  home: { group: "groupF", pos: 0 }, away: { group: "groupH", pos: 1 }, homeLabel: "1F", awayLabel: "2H" },
  { matchId: "R32_7",  home: { group: "groupG", pos: 0 }, away: { group: "groupE", pos: 1 }, homeLabel: "1G", awayLabel: "2E" },
  { matchId: "R32_8",  home: { group: "groupH", pos: 0 }, away: { group: "groupF", pos: 1 }, homeLabel: "1H", awayLabel: "2F" },
  { matchId: "R32_9",  home: { group: "groupI", pos: 0 }, away: { group: "groupK", pos: 1 }, homeLabel: "1I", awayLabel: "2K" },
  { matchId: "R32_10", home: { group: "groupJ", pos: 0 }, away: { group: "groupL", pos: 1 }, homeLabel: "1J", awayLabel: "2L" },
  { matchId: "R32_11", home: { group: "groupK", pos: 0 }, away: { group: "groupI", pos: 1 }, homeLabel: "1K", awayLabel: "2I" },
  { matchId: "R32_12", home: { group: "groupL", pos: 0 }, away: { group: "groupJ", pos: 1 }, homeLabel: "1L", awayLabel: "2J" },
  // 3rd-place slots: seeded by best-to-worst 3rd place ranking
  { matchId: "R32_13", home: { third: 0 }, away: { third: 7 }, homeLabel: "3°M-1", awayLabel: "3°M-8" },
  { matchId: "R32_14", home: { third: 1 }, away: { third: 6 }, homeLabel: "3°M-2", awayLabel: "3°M-7" },
  { matchId: "R32_15", home: { third: 2 }, away: { third: 5 }, homeLabel: "3°M-3", awayLabel: "3°M-6" },
  { matchId: "R32_16", home: { third: 3 }, away: { third: 4 }, homeLabel: "3°M-4", awayLabel: "3°M-5" },
];

function resolveTeam(
  src: Src,
  allStandings: Record<Stage, TeamStats[]>,
  bestThird: TeamStats[]
): { name: string; flag: string } | null {
  if ("third" in src) {
    const t = bestThird[src.third];
    return t ? { name: t.team, flag: t.flag } : null;
  }
  const team = allStandings[src.group]?.[src.pos];
  return team ? { name: team.team, flag: team.flag } : null;
}

export function computeAutoKnockoutTeams(
  results: Record<string, Result>,
  knockoutWinners: Record<string, "home" | "away"> = {}
): Record<string, string> {
  const teams: Record<string, string> = {};

  // R32: from group standings
  const allStandings = calcAllStandings(results);
  for (const slot of getR32Assignments(allStandings, results)) {
    if (!slot.ready) continue;
    teams[`${slot.matchId}_home`]     = slot.home;
    teams[`${slot.matchId}_away`]     = slot.away;
    teams[`${slot.matchId}_homeFlag`] = slot.homeFlag;
    teams[`${slot.matchId}_awayFlag`] = slot.awayFlag;
  }

  // R16 → Final: from previous round results + knockoutWinners for penalty cases
  // Labels: "G R32-1", "G R16-1", "G QF-1", "G SF-1", "Perdedor SF-1"
  const re = /^(G|Perdedor) ([A-Z0-9]+)-(\d+)$/;
  for (const match of MATCHES) {
    for (const side of ["home", "away"] as const) {
      const label = side === "home" ? match.homeLabel : match.awayLabel;
      if (!label) continue;
      const m = label.match(re);
      if (!m) continue;

      const [, type, prefix, num] = m;
      // "R32" → "R32_1", "QF" → "QF1", "SF" → "SF1"
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
    }
  }

  return teams;
}

export function getR32Assignments(
  allStandings: Record<Stage, TeamStats[]>,
  results: Record<string, Result>
): KnockoutSlot[] {
  const { bestThird } = calcAdvancing(allStandings);
  const allGroupsComplete = GROUP_STAGES.every((s) => isGroupComplete(s, results));

  return R32_MAP.map(({ matchId, home, away, homeLabel, awayLabel }) => {
    // Check if the relevant groups are complete
    let ready = false;
    if ("third" in home) {
      ready = allGroupsComplete; // 3rd place needs ALL groups done
    } else {
      const hSrc = home as { group: Stage; pos: 0 | 1 };
      const hDone = isGroupComplete(hSrc.group, results);
      const aDone = "third" in away ? allGroupsComplete : isGroupComplete((away as { group: Stage; pos: 0 | 1 }).group, results);
      ready = hDone && aDone;
    }

    const h = resolveTeam(home, allStandings, bestThird);
    const a = resolveTeam(away, allStandings, bestThird);

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
