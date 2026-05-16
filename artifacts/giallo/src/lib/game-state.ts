export const MIN_QUESTIONS_TO_ACCUSE = 5;

export const MOTIVES = [
  { id: "gelosia", label: "Gelosia sentimentale" },
  { id: "contratto", label: "Disputa sul contratto Castellano" },
  { id: "ricatto", label: "Ricatto con documenti riservati" },
  { id: "vendetta", label: "Vendetta per un torto passato" },
];

export type CaseStatus = "playing" | "solved" | "failed";

export type GameState = {
  status: CaseStatus;
  accusation: { suspectId: string; motiveId: string } | null;
  totalQuestions: number;
};

const STORAGE_KEY = "giallo_caso_001";

export function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as GameState;
  } catch {
    // ignore
  }
  return { status: "playing", accusation: null, totalQuestions: 0 };
}

export function saveGameState(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function incrementQuestionCount(): number {
  const state = loadGameState();
  const updated: GameState = { ...state, totalQuestions: state.totalQuestions + 1 };
  saveGameState(updated);
  return updated.totalQuestions;
}

export function recordAccusation(suspectId: string, motiveId: string, correct: boolean): GameState {
  const state: GameState = {
    status: correct ? "solved" : "failed",
    accusation: { suspectId, motiveId },
    totalQuestions: loadGameState().totalQuestions,
  };
  saveGameState(state);
  return state;
}

export function resetGame(): void {
  localStorage.removeItem(STORAGE_KEY);
}
