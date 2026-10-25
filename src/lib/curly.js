// Pure text transforms: straight quotes to curly quotes, "--" to an em dash, a hyphen that opens a parenthetical to an en dash, "1/2" to "½".

// "--" becomes "—" unless it stands alone between whitespace (the null-move
// token in PGN movetext) or is part of a longer run of hyphens.
export function toEmDashes(text) {
  return text.replace(/(^|[^-])--(?!-)/g, (match, before, offset, whole) => {
    const after = whole.charAt(offset + match.length);
    const aloneBefore = before === '' || /\s/.test(before);
    const aloneAfter = after === '' || /\s/.test(after);
    return aloneBefore && aloneAfter ? match : `${before}—`;
  });
}

// A hyphen that opens a parenthetical stands glued to the following word after a space ("g3 oynayarak -ya da hazırlayarak- g dikeyini"):
// that is a dash, written as an en dash (–). A closing hyphen glued to the previous word is converted together with its opening one
// (within one sentence); an opening hyphen alone ("yaşanır -ya da yaşanmalıdır") is converted on its own. Not touched: a hyphen inside
// a word or move (Nimzo-Hint, e4-e5, O-O), a list marker ("- item": a space follows), "+-" / "-+" evaluations. No lookbehind (Safari < 16.4).
export function toParentheticalDashes(text) {
  return text
    .replace(/(^|[\s(])-(?=\p{L})([^\n-]{1,160}?\p{L})-(?=[\s.,;:!?)]|$)/gu, '$1–$2–')
    .replace(/(^|[\s(])-(?=\p{L})/gu, '$1–');
}

// A conventional SmartyPants pass: a quote after whitespace, an opening
// bracket or the start of the text opens; every other one closes (which is
// also the right character for an apostrophe, e.g. "İstanbul'da").
export function toCurly(text) {
  return toEmDashes(text)
    .replace(/(^|[-—\s([{"])'/g, '$1‘')
    .replace(/'/g, '’')
    .replace(/(^|[-—\s([{'])"/g, '$1“')
    .replace(/"/g, '”');
}

// "1/2" standing on its own becomes "½" (a result such as 1/2-1/2, or half a point). Not touched: a longer number or
// date around it (11/2, 1/2/2020, 1/25, 1/2,5), a letter in front or behind (a link's path), or a slash.
// No lookbehind (Safari before 16.4 fails to parse it): the character in front is captured and put back.
export function toHalves(text) {
  return text.replace(/(^|[^\p{L}\p{N}/.,])1\/2(?![\p{L}\p{N}/]|[.,]\p{N})/gu, '$1½');
}

// "…♘c6", "12… ♗e6", "...e5": the dots that mark Black's move never end a line before the move itself. A space after
// them becomes a no-break space; with no space, a word joiner (U+2060) forbids the break. Only before something that
// reads as a move (a figurine, a piece letter or pawn file with its square, a castling), so ordinary prose
// ("bekleyince… sonra") still wraps.
const BLACK_MOVE = /(…|\.{3})([ \u00a0]?)(?=[♔♕♖♗♘]|[KQRBN]?[a-h]?x?[a-h][1-8]|O-O)/g;
export function keepEllipsisWithMove(text) {
  return text.replace(BLACK_MOVE, (_, dots, space) => `${dots}${space ? '\u00a0' : '\u2060'}`);
}

// Everything the prose gets: curly quotes, em dashes, parenthetical en dashes, halves, and Black's "…" glued to its move.
export function toTypography(text) {
  return keepEllipsisWithMove(toHalves(toParentheticalDashes(toCurly(text))));
}
