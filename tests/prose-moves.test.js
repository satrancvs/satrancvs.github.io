import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Chess } from 'chess.js';
import { ProseLinker } from '../src/lib/prose-moves.js';

const after = (...sans) => { const g = new Chess(); sans.forEach((s) => g.move(s)); return g.fen(); };
const scan = (text, fenAfter, fenBefore) => new ProseLinker(Chess, [fenAfter, fenBefore]).scan(text);

test('a line continues across prose when the next move number follows', () => {
  const { moves, failed } = scan('Beyaz 2. ♘c3 oynarsa hemen 2… ♗b4 oynayacaktım, devamında 3. ♘d5 ♗e7 4. d4 d6 ve sevdiğim yapı.', after('c4', 'e5'), after('c4'));
  assert.deepEqual(moves.map((m) => m.text), ['♘c3', '♗b4', '♘d5', '♗e7', 'd4', 'd6']);
  assert.equal(new Set(moves.map((m) => m.run)).size, 1);
  assert.deepEqual(failed, []);
});

test('an alternative inside the same sentence starts from an earlier position of the comment', () => {
  const start = new Chess().fen();
  const { moves, failed } = scan('1. e4 e5 2. Nf3 Nc6 3. Bb5 – ama 2. f4 exf4 de oynanabilir.', start, start);
  assert.deepEqual(moves.map((m) => m.text), ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'f4', 'exf4']);
  assert.deepEqual([...new Set(moves.map((m) => m.run))].length, 2);
  assert.deepEqual(failed, []);
});

test('a numbered prose move that cannot be played is reported (typo such as "13… gxf4" for white)', () => {
  const g = new Chess('r1bq1rk1/pp3pbp/2pp2p1/8/2PnPB2/2NP2PP/PP4B1/R2Q1RK1 b - - 0 13');
  const { failed } = scan('Bununla birlikte 13… gxf4 hamlesinin ardından', g.fen(), g.fen());
  assert.deepEqual(failed.map((f) => f.text), ['gxf4']);
});

test('words that merely look like moves are ignored when no move number precedes them', () => {
  const { moves, failed } = scan('Siyah d6-e5 piyon merkeziyle oynamak istiyor ve e5’teki piyon', after('c4', 'e5'), after('c4'));
  assert.deepEqual(moves, []);
  assert.deepEqual(failed, []);
});
