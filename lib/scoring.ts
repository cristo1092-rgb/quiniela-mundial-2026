// Prediction is an exact score the player enters
export interface Prediction {
  g1: number;
  g2: number;
}

export interface Result {
  g1: number;
  g2: number;
}

export type ResultLabel = "1" | "X" | "2";

export interface PlayerScore {
  name: string;
  points: number;
  correct: number;  // result label correct (1/X/2)
  exact: number;    // exact score correct
  played: number;
}

export function getResultLabel(g1: number, g2: number): ResultLabel {
  if (g1 > g2) return "1";
  if (g1 < g2) return "2";
  return "X";
}

export function calcMatchPoints(prediction: Prediction, result: Result): number {
  const predLabel = getResultLabel(prediction.g1, prediction.g2);
  const actualLabel = getResultLabel(result.g1, result.g2);
  if (predLabel !== actualLabel) return 0;
  const isExact = prediction.g1 === result.g1 && prediction.g2 === result.g2;
  return isExact ? 5 : 3;
}

export function calcRanking(
  predictions: Record<string, Record<string, Prediction>>,
  results: Record<string, Result>
): PlayerScore[] {
  const scores: PlayerScore[] = [];

  for (const [playerName, playerPredictions] of Object.entries(predictions)) {
    let points = 0;
    let correct = 0;
    let exact = 0;
    let played = 0;

    for (const [matchId, prediction] of Object.entries(playerPredictions)) {
      const result = results[matchId];
      if (!result) continue;
      played++;
      const pts = calcMatchPoints(prediction, result);
      if (pts >= 3) correct++;
      if (pts === 5) exact++;
      points += pts;
    }

    scores.push({ name: playerName, points, correct, exact, played });
  }

  return scores.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.exact - a.exact;
  });
}
