export type Stage =
  | "groupA" | "groupB" | "groupC" | "groupD" | "groupE" | "groupF"
  | "groupG" | "groupH" | "groupI" | "groupJ" | "groupK" | "groupL"
  | "round32" | "round16" | "quarters" | "semis" | "thirdPlace" | "final";

export interface Match {
  id: string;
  stage: Stage;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  date: string;
  /** Kickoff time in HH:MM (24h), hora Monterrey CDT (UTC-5). Used to lock predictions. */
  time: string;
  homeLabel?: string;
  awayLabel?: string;
}

/** Returns the prediction deadline: 23:59 Monterrey (GMT-6) the day BEFORE the match.
 *  México abolió horario de verano 2023 — siempre GMT-6. */
export function getDeadlineUTC(match: Match): Date {
  // midnight of match day in Monterrey = end of previous day (23:59:59)
  return new Date(`${match.date}T00:00:00-06:00`);
}

/** True once the prediction deadline has passed (midnight Monterrey on match day). */
export function isKickoffPast(match: Match): boolean {
  return Date.now() >= getDeadlineUTC(match).getTime();
}

/** Returns the actual match kickoff time in UTC, using match.time (HH:MM) in Monterrey (GMT-6). */
export function getMatchKickoffUTC(match: Match): Date {
  return new Date(`${match.date}T${match.time}:00-06:00`);
}

/** @deprecated use getDeadlineUTC */
export const getKickoffUTC = getDeadlineUTC;

export const STAGE_LABELS: Record<Stage, string> = {
  groupA: "Grupo A", groupB: "Grupo B", groupC: "Grupo C", groupD: "Grupo D",
  groupE: "Grupo E", groupF: "Grupo F", groupG: "Grupo G", groupH: "Grupo H",
  groupI: "Grupo I", groupJ: "Grupo J", groupK: "Grupo K", groupL: "Grupo L",
  round32: "Octavos de Final", round16: "Dieciseisavos",
  quarters: "Cuartos de Final", semis: "Semifinales",
  thirdPlace: "Tercer Lugar", final: "Final",
};

export const GROUP_STAGES: Stage[] = [
  "groupA","groupB","groupC","groupD","groupE","groupF",
  "groupG","groupH","groupI","groupJ","groupK","groupL",
];

export const KNOCKOUT_STAGES: Stage[] = [
  "round32","round16","quarters","semis","thirdPlace","final",
];

// ISO 3166-1 alpha-2 codes for flagcdn.com images (work on all OS including Windows)
const FLAGS: Record<string, string> = {
  "México": "mx", "Sudáfrica": "za", "Corea del Sur": "kr", "Chequia": "cz",
  "Canadá": "ca", "Bosnia-Herzegovina": "ba", "Qatar": "qa", "Suiza": "ch",
  "Brasil": "br", "Marruecos": "ma", "Haití": "ht", "Escocia": "gb-sct",
  "Estados Unidos": "us", "Paraguay": "py", "Australia": "au", "Turquía": "tr",
  "Alemania": "de", "Curazao": "cw", "Costa de Marfil": "ci", "Ecuador": "ec",
  "Países Bajos": "nl", "Japón": "jp", "Suecia": "se", "Túnez": "tn",
  "Bélgica": "be", "Egipto": "eg", "Irán": "ir", "Nueva Zelanda": "nz",
  "España": "es", "Cabo Verde": "cv", "Arabia Saudí": "sa", "Uruguay": "uy",
  "Francia": "fr", "Senegal": "sn", "Irak": "iq", "Noruega": "no",
  "Argentina": "ar", "Argelia": "dz", "Austria": "at", "Jordania": "jo",
  "Portugal": "pt", "Congo DR": "cd", "Uzbekistán": "uz", "Colombia": "co",
  "Inglaterra": "gb-eng", "Croacia": "hr", "Ghana": "gh", "Panamá": "pa",
  "TBD": "",
};

function m(
  id: string,
  stage: Stage,
  home: string,
  away: string,
  date: string,
  time: string,
  homeLabel?: string,
  awayLabel?: string
): Match {
  return {
    id,
    stage,
    homeTeam: home,
    awayTeam: away,
    homeFlag: FLAGS[home] ?? "",
    awayFlag: FLAGS[away] ?? "",
    date,
    time,
    homeLabel,
    awayLabel,
  };
}

// Times are in hora Monterrey CST (UTC-6) — México sin horario de verano desde 2023
// Horarios oficiales FIFA/ESPN convertidos de ET (UTC-4) a Monterrey (UTC-6) = ET - 2h
export const MATCHES: Match[] = [
  // ── GRUPO A ──────────────────────────────────────────────────────────────
  m("A1", "groupA", "México",        "Sudáfrica",    "2026-06-11", "13:00"), // 3PM ET — partido inaugural
  m("A2", "groupA", "Corea del Sur", "Chequia",      "2026-06-11", "20:00"), // 10PM ET
  m("A3", "groupA", "Chequia",       "Sudáfrica",    "2026-06-18", "10:00"), // 12PM ET
  m("A4", "groupA", "México",        "Corea del Sur","2026-06-18", "19:00"), // 9PM ET
  m("A5", "groupA", "México",        "Chequia",      "2026-06-24", "19:00"), // 9PM ET
  m("A6", "groupA", "Corea del Sur", "Sudáfrica",    "2026-06-24", "19:00"), // 9PM ET

  // ── GRUPO B ──────────────────────────────────────────────────────────────
  m("B1", "groupB", "Canadá",            "Bosnia-Herzegovina","2026-06-12","13:00"), // 3PM ET
  m("B2", "groupB", "Qatar",             "Suiza",             "2026-06-13","13:00"), // 3PM ET
  m("B3", "groupB", "Suiza",             "Bosnia-Herzegovina","2026-06-18","13:00"), // 3PM ET
  m("B4", "groupB", "Canadá",            "Qatar",             "2026-06-18","16:00"), // 6PM ET
  m("B5", "groupB", "Suiza",             "Canadá",            "2026-06-24","13:00"), // 3PM ET
  m("B6", "groupB", "Bosnia-Herzegovina","Qatar",             "2026-06-24","13:00"), // 3PM ET

  // ── GRUPO C ──────────────────────────────────────────────────────────────
  m("C1", "groupC", "Brasil",    "Marruecos","2026-06-13","16:00"), // 6PM ET
  m("C2", "groupC", "Haití",     "Escocia",  "2026-06-13","19:00"), // 9PM ET
  m("C3", "groupC", "Brasil",    "Haití",    "2026-06-19","18:30"), // 8:30PM ET
  m("C4", "groupC", "Escocia",   "Marruecos","2026-06-19","16:00"), // 6PM ET
  m("C5", "groupC", "Brasil",    "Escocia",  "2026-06-24","16:00"), // 6PM ET
  m("C6", "groupC", "Marruecos", "Haití",    "2026-06-24","16:00"), // 6PM ET

  // ── GRUPO D ──────────────────────────────────────────────────────────────
  m("D1", "groupD", "Estados Unidos","Paraguay",       "2026-06-12","19:00"), // 9PM ET
  m("D2", "groupD", "Australia",     "Turquía",        "2026-06-13","22:00"), // 12AM ET Jun 14
  m("D3", "groupD", "Estados Unidos","Australia",      "2026-06-19","13:00"), // 3PM ET
  m("D4", "groupD", "Turquía",       "Paraguay",       "2026-06-19","21:00"), // 11PM ET
  m("D5", "groupD", "Turquía",       "Estados Unidos", "2026-06-25","20:00"), // 10PM ET
  m("D6", "groupD", "Paraguay",      "Australia",      "2026-06-25","20:00"), // 10PM ET

  // ── GRUPO E ──────────────────────────────────────────────────────────────
  m("E1", "groupE", "Alemania",        "Curazao",        "2026-06-14","11:00"), // 1PM ET
  m("E2", "groupE", "Costa de Marfil", "Ecuador",        "2026-06-14","17:00"), // 7PM ET
  m("E3", "groupE", "Alemania",        "Costa de Marfil","2026-06-20","14:00"), // 4PM ET
  m("E4", "groupE", "Ecuador",         "Curazao",        "2026-06-20","18:00"), // 8PM ET
  m("E5", "groupE", "Ecuador",         "Alemania",       "2026-06-25","14:00"), // 4PM ET
  m("E6", "groupE", "Curazao",         "Costa de Marfil","2026-06-25","14:00"), // 4PM ET

  // ── GRUPO F ──────────────────────────────────────────────────────────────
  m("F1", "groupF", "Países Bajos","Japón",        "2026-06-14","14:00"), // 4PM ET
  m("F2", "groupF", "Suecia",      "Túnez",        "2026-06-14","20:00"), // 10PM ET
  m("F3", "groupF", "Países Bajos","Suecia",       "2026-06-20","11:00"), // 1PM ET
  m("F4", "groupF", "Túnez",       "Japón",        "2026-06-20","22:00"), // 12AM ET Jun 21
  m("F5", "groupF", "Túnez",       "Países Bajos", "2026-06-25","17:00"), // 7PM ET
  m("F6", "groupF", "Japón",       "Suecia",       "2026-06-25","17:00"), // 7PM ET

  // ── GRUPO G ──────────────────────────────────────────────────────────────
  m("G1", "groupG", "Bélgica",      "Egipto",       "2026-06-15","13:00"), // 3PM ET
  m("G2", "groupG", "Irán",         "Nueva Zelanda","2026-06-15","19:00"), // 9PM ET
  m("G3", "groupG", "Bélgica",      "Irán",         "2026-06-21","13:00"), // 3PM ET
  m("G4", "groupG", "Nueva Zelanda","Egipto",       "2026-06-21","19:00"), // 9PM ET
  m("G5", "groupG", "Bélgica",      "Nueva Zelanda","2026-06-26","21:00"), // 11PM ET
  m("G6", "groupG", "Irán",         "Egipto",       "2026-06-26","21:00"), // 11PM ET

  // ── GRUPO H ──────────────────────────────────────────────────────────────
  m("H1", "groupH", "España",      "Cabo Verde",  "2026-06-15","10:00"), // 12PM ET
  m("H2", "groupH", "Arabia Saudí","Uruguay",     "2026-06-15","16:00"), // 6PM ET
  m("H3", "groupH", "España",      "Arabia Saudí","2026-06-21","10:00"), // 12PM ET
  m("H4", "groupH", "Uruguay",     "Cabo Verde",  "2026-06-21","16:00"), // 6PM ET
  m("H5", "groupH", "Cabo Verde",  "Arabia Saudí","2026-06-26","18:00"), // 8PM ET
  m("H6", "groupH", "Uruguay",     "España",      "2026-06-26","18:00"), // 8PM ET

  // ── GRUPO I ──────────────────────────────────────────────────────────────
  m("I1", "groupI", "Francia", "Senegal","2026-06-16","13:00"), // 3PM ET
  m("I2", "groupI", "Irak",    "Noruega","2026-06-16","16:00"), // 6PM ET
  m("I3", "groupI", "Francia", "Irak",   "2026-06-22","15:00"), // 5PM ET
  m("I4", "groupI", "Senegal", "Noruega","2026-06-22","18:00"), // 8PM ET
  m("I5", "groupI", "Noruega", "Francia","2026-06-26","13:00"), // 3PM ET
  m("I6", "groupI", "Irak",    "Senegal","2026-06-26","13:00"), // 3PM ET

  // ── GRUPO J ──────────────────────────────────────────────────────────────
  m("J1", "groupJ", "Argentina","Argelia", "2026-06-16","19:00"), // 9PM ET
  m("J2", "groupJ", "Austria",  "Jordania","2026-06-16","22:00"), // 12AM ET Jun 17
  m("J3", "groupJ", "Argentina","Austria", "2026-06-22","11:00"), // 1PM ET
  m("J4", "groupJ", "Argelia",  "Jordania","2026-06-22","21:00"), // 11PM ET
  m("J5", "groupJ", "Argentina","Jordania","2026-06-27","20:00"), // 10PM ET
  m("J6", "groupJ", "Austria",  "Argelia", "2026-06-27","20:00"), // 10PM ET

  // ── GRUPO K ──────────────────────────────────────────────────────────────
  m("K1", "groupK", "Portugal",   "Congo DR",   "2026-06-17","11:00"), // 1PM ET
  m("K2", "groupK", "Uzbekistán", "Colombia",   "2026-06-17","20:00"), // 10PM ET
  m("K3", "groupK", "Portugal",   "Uzbekistán", "2026-06-23","11:00"), // 1PM ET
  m("K4", "groupK", "Colombia",   "Congo DR",   "2026-06-23","20:00"), // 10PM ET
  m("K5", "groupK", "Portugal",   "Colombia",   "2026-06-27","17:30"), // 7:30PM ET
  m("K6", "groupK", "Uzbekistán", "Congo DR",   "2026-06-27","17:30"), // 7:30PM ET

  // ── GRUPO L ──────────────────────────────────────────────────────────────
  m("L1", "groupL", "Inglaterra","Croacia",  "2026-06-17","14:00"), // 4PM ET
  m("L2", "groupL", "Ghana",     "Panamá",   "2026-06-17","17:00"), // 7PM ET
  m("L3", "groupL", "Inglaterra","Ghana",    "2026-06-23","14:00"), // 4PM ET
  m("L4", "groupL", "Croacia",   "Panamá",   "2026-06-23","17:00"), // 7PM ET
  m("L5", "groupL", "Panamá",    "Inglaterra","2026-06-27","15:00"), // 5PM ET
  m("L6", "groupL", "Ghana",     "Croacia",  "2026-06-27","15:00"), // 5PM ET

  // ── DIECISEISAVOS (Round of 32) ───────────────────────────────────────────
  m("R32_1",  "round32","TBD","TBD","2026-06-29","14:00","1A","2C"),
  m("R32_2",  "round32","TBD","TBD","2026-06-29","20:00","1B","2D"),
  m("R32_3",  "round32","TBD","TBD","2026-06-30","14:00","1C","2A"),
  m("R32_4",  "round32","TBD","TBD","2026-06-30","20:00","1D","2B"),
  m("R32_5",  "round32","TBD","TBD","2026-07-01","14:00","1E","2G"),
  m("R32_6",  "round32","TBD","TBD","2026-07-01","20:00","1F","2H"),
  m("R32_7",  "round32","TBD","TBD","2026-07-02","14:00","1G","2E"),
  m("R32_8",  "round32","TBD","TBD","2026-07-02","20:00","1H","2F"),
  m("R32_9",  "round32","TBD","TBD","2026-07-03","14:00","1I","2K"),
  m("R32_10", "round32","TBD","TBD","2026-07-03","20:00","1J","2L"),
  m("R32_11", "round32","TBD","TBD","2026-07-04","14:00","1K","2I"),
  m("R32_12", "round32","TBD","TBD","2026-07-04","20:00","1L","2J"),
  m("R32_13", "round32","TBD","TBD","2026-07-05","14:00","3ABC","3DEF"),
  m("R32_14", "round32","TBD","TBD","2026-07-05","20:00","3GHI","3JKL"),
  m("R32_15", "round32","TBD","TBD","2026-07-06","14:00","3ABD","3CEF"),
  m("R32_16", "round32","TBD","TBD","2026-07-06","20:00","3GIJ","3HKL"),

  // ── OCTAVOS (Round of 16) ─────────────────────────────────────────────────
  m("R16_1","round16","TBD","TBD","2026-07-09","14:00","G R32-1","G R32-2"),
  m("R16_2","round16","TBD","TBD","2026-07-09","20:00","G R32-3","G R32-4"),
  m("R16_3","round16","TBD","TBD","2026-07-10","14:00","G R32-5","G R32-6"),
  m("R16_4","round16","TBD","TBD","2026-07-10","20:00","G R32-7","G R32-8"),
  m("R16_5","round16","TBD","TBD","2026-07-11","14:00","G R32-9", "G R32-10"),
  m("R16_6","round16","TBD","TBD","2026-07-11","20:00","G R32-11","G R32-12"),
  m("R16_7","round16","TBD","TBD","2026-07-12","14:00","G R32-13","G R32-14"),
  m("R16_8","round16","TBD","TBD","2026-07-12","20:00","G R32-15","G R32-16"),

  // ── CUARTOS ───────────────────────────────────────────────────────────────
  m("QF1","quarters","TBD","TBD","2026-07-14","14:00","G R16-1","G R16-2"),
  m("QF2","quarters","TBD","TBD","2026-07-14","20:00","G R16-3","G R16-4"),
  m("QF3","quarters","TBD","TBD","2026-07-15","14:00","G R16-5","G R16-6"),
  m("QF4","quarters","TBD","TBD","2026-07-15","20:00","G R16-7","G R16-8"),

  // ── SEMIFINALES ───────────────────────────────────────────────────────────
  m("SF1","semis","TBD","TBD","2026-07-17","19:00","G QF-1","G QF-2"),
  m("SF2","semis","TBD","TBD","2026-07-18","19:00","G QF-3","G QF-4"),

  // ── TERCER LUGAR ──────────────────────────────────────────────────────────
  m("TP", "thirdPlace","TBD","TBD","2026-07-18","15:00","Perdedor SF-1","Perdedor SF-2"),

  // ── FINAL ─────────────────────────────────────────────────────────────────
  m("FINAL","final","TBD","TBD","2026-07-19","19:00","G SF-1","G SF-2"),
];

export function getMatchById(id: string): Match | undefined {
  return MATCHES.find((m) => m.id === id);
}

export function getMatchesByStage(stage: Stage): Match[] {
  return MATCHES.filter((m) => m.stage === stage);
}
