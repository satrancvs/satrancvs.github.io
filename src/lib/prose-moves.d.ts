type Game = { move: (san: string, opts?: object) => { from: string; to: string } | null; fen: () => string };
export type ProseMove = { index: number; end: number; text: string; fen: string; from: string; to: string; run: number; step: number };
export class ProseLinker {
  constructor(Chess: new (fen?: string) => Game, bases: string[]);
  scan(text: string): { moves: ProseMove[]; failed: { index: number; text: string }[] };
}
