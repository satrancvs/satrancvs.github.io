// Curly quotes, em dashes and "1/2" → "½" applied to the rendered article.
//
// Ported from satranckahvesi-eski (`_js/text/curly-quotes.js`). Rules:
//  - article prose is converted;
//  - inside a game (`.cp-game`) ONLY the comments are converted. Move text, headers and results are left alone
//    (a PGN null move "--" or a result such as 1/2-1/2 must stay literal there);
//  - <pre> (the crosstable), <code>, <script>, <style> and raw <pgn>/<fen>/... elements are never touched.
//
// ChessPublica draws comments late and in pieces, so `watchComments` keeps new ones converted too.

import { toTypography } from './curly.js';

const SKIPPED_TAGS = new Set(['PGN', 'FEN', 'PUZZLE', 'PGN-PLAYER', 'PGN-STUDY', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'IFRAME', 'TEXTAREA']);
const GAME = '.cp-game';

// What ChessPublica renders author prose into: main-line comments, and the whole line of a side variation (move
// notation never contains a quote, so the paragraph is the closest thing to a comment element). The play views
// use .video-comment / .variation-comment. Move text lives in `.pgn-mainline` and is not listed on purpose.
export const COMMENT_SELECTOR = '.pgn-comment, .pgn-variation-line, .variation-comment, .video-comment';

const needsWork = (text: string) => text.includes('"') || text.includes("'") || text.includes('--') || text.includes('1/2') || text.includes('…') || text.includes('...');

/** Converts every eligible text node under `root`; `skip` can exclude whole subtrees. */
export function curlyPass(root: Element, skip?: (el: Element) => boolean) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!needsWork(node.nodeValue ?? '')) continue;
    let skipped = false;
    // Stops at `root`, so a pass over a comment does not climb out of the element it was handed.
    for (let el = node.parentElement; el && el !== root; el = el.parentElement) {
      if (SKIPPED_TAGS.has(el.tagName) || skip?.(el)) {
        skipped = true;
        break;
      }
    }
    if (!skipped) targets.push(node as Text);
  }
  for (const node of targets) {
    const value = node.nodeValue ?? '';
    // A quote opening a text node is not necessarily at the start of a word (<b>Jan Timman</b>'ın): hand over the
    // preceding sibling's last character as context, then strip it back off.
    const prev = node.previousSibling?.textContent?.slice(-1) ?? '';
    const converted = prev ? toTypography(prev + value).slice(prev.length) : toTypography(value);
    // Skip the write when nothing changed: a same-value assignment still queues a mutation record.
    if (value !== converted) node.nodeValue = converted;
  }
}

/** Article prose: everything except the games (their comments are handled by `curlyComments`). */
export const curlyProse = (root: Element) => curlyPass(root, (el) => el.matches(GAME));

/** The comments inside every game under `root`. */
export function curlyComments(root: Element) {
  root.querySelectorAll(GAME).forEach((game) => game.querySelectorAll(COMMENT_SELECTOR).forEach((comment) => curlyPass(comment)));
}

const closestComment = (node: Node) => {
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const comment = el?.closest(COMMENT_SELECTOR) ?? null;
  return comment && comment.closest(GAME) ? comment : null;
};

/** Keeps comments that ChessPublica adds or rewrites later converted. Returns a function that stops watching. */
export function watchComments(root: Element) {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        const owner = closestComment(record.target);
        if (owner) curlyPass(owner);
        continue;
      }
      record.addedNodes.forEach((added) => {
        if (added.nodeType === Node.TEXT_NODE) {
          const owner = closestComment(added);
          if (owner) curlyPass(owner);
        } else if (added.nodeType === Node.ELEMENT_NODE) {
          const el = added as Element;
          const owner = closestComment(el);
          if (owner) curlyPass(owner);
          if (el.closest(GAME) || el.matches(GAME)) el.querySelectorAll(COMMENT_SELECTOR).forEach((comment) => curlyPass(comment));
        }
      });
    }
  });
  observer.observe(root, { childList: true, characterData: true, subtree: true });
  return () => observer.disconnect();
}
