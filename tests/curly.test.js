import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keepEllipsisWithMove, toCurly, toEmDashes, toHalves, toParentheticalDashes, toTypography } from '../src/lib/curly.js';

test('apostrophes close, quotes open after whitespace and brackets', () => {
  assert.equal(toCurly("İstanbul'da"), 'İstanbul’da');
  assert.equal(toCurly('"merhaba" dedi'), '“merhaba” dedi');
  assert.equal(toCurly("'tek' (\"çift\")"), '‘tek’ (“çift”)');
});

test('"--" becomes an em dash when glued to a word', () => {
  assert.equal(toEmDashes('getiren-- artık'), 'getiren— artık');
  assert.equal(toEmDashes('--Kasparov'), '—Kasparov');
});

test('a standalone "--" (PGN null move) and longer hyphen runs are left alone', () => {
  assert.equal(toEmDashes('1. e4 -- 2. d4'), '1. e4 -- 2. d4');
  assert.equal(toEmDashes('a---b'), 'a---b');
});

test('a standalone "1/2" becomes "½"', () => {
  assert.equal(toHalves('1/2-1/2'), '½-½');
  assert.equal(toHalves('Tal, 1/2-1/2, URS-ch47'), 'Tal, ½-½, URS-ch47');
  assert.equal(toHalves('1/2 puan ve (1/2)'), '½ puan ve (½)');
  assert.equal(toHalves('0-1 ve 1/2.'), '0-1 ve ½.');
});

test('"1/2" inside a longer number, a date, a path or a word is left alone', () => {
  assert.equal(toHalves('11/2 ve 1/25 ve 1/2,5 ve 1/2.5'), '11/2 ve 1/25 ve 1/2,5 ve 1/2.5');
  assert.equal(toHalves('1/2/2020'), '1/2/2020');
  assert.equal(toHalves('lichess.org/study/ab1/2xyz'), 'lichess.org/study/ab1/2xyz');
  assert.equal(toHalves('a1/2b'), 'a1/2b');
});

test('toTypography applies quotes, dashes and halves together', () => {
  assert.equal(toTypography('"Berabere" dedi: 1/2-1/2'), '“Berabere” dedi: ½-½');
});

test("Black's dots stay with the move: no-break space or word joiner, ordinary prose still wraps", () => {
  assert.equal(keepEllipsisWithMove('…♘c6'), '…\u2060♘c6');
  assert.equal(keepEllipsisWithMove('12… ♗e6'), '12…\u00a0♗e6');
  assert.equal(keepEllipsisWithMove('3... f5 ve ...Rxe5 ile …O-O'), '3...\u00a0f5 ve ...\u2060Rxe5 ile …\u2060O-O');
  assert.equal(keepEllipsisWithMove('bekleyince… sonra, Rakip… bakıma…'), 'bekleyince… sonra, Rakip… bakıma…');
  assert.equal(toTypography('1… e5’i'), '1…\u00a0e5’i');
});

test('a hyphen that opens a parenthetical becomes an en dash (with its closing hyphen), alone too', () => {
  assert.equal(toParentheticalDashes('g3 oynayarak -ya da hazırlayarak- g dikeyini'), 'g3 oynayarak –ya da hazırlayarak– g dikeyini');
  assert.equal(toParentheticalDashes('kanadını ve -bu konumda en önemlisi- merkezi'), 'kanadını ve –bu konumda en önemlisi– merkezi');
  assert.equal(toParentheticalDashes('yaşanır -ya da yaşanmalıdır'), 'yaşanır –ya da yaşanmalıdır');
});

test('hyphens inside words, moves, evaluations and list markers are left alone', () => {
  for (const s of ['Nimzo-Hint yapıları', 'e4-e5 ve O-O', '27. c5 +- ve -+', '- madde', '0-0-0', 'a -1 puan']) assert.equal(toParentheticalDashes(s), s);
});
