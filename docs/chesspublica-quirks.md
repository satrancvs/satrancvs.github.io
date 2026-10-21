> **Note for the React site (satranckahvesi.github.io).** The text below was copied unchanged from
> `satranckahvesi-eski` (the old Jekyll site); paths such as `_js/...` and `_css/...` refer to that repo.
> What differs here:
>
> - ChessPublica is a **local, patched copy** at `public/chesspublica/` (not loaded from the CDN), loaded lazily by
>   `src/lib/chesspublica.ts` on article pages that contain games. It ships **without `pgn-player.js`**, so
>   `<pgn-player>` (separate module) and, for `[View "study"]` games, `<pgn-study>` (`pgn-study.js`, one-column layout,
>   `src/lib/study-fix.ts`; no puzzles there) are loaded on demand; view switching and the old scroll restoration are **not available**.
> - Patches made directly in `public/chesspublica/ChessPublica.all.min.js`: (1) removed the block that tried to load
>   `./pgn-player.js` via `new URL(..., undefined)`, which threw in the single-file build before the global was set;
>   (2) `window.ChessPublica` is an alias of `window.JekyllChess`; (3) the `[FEN "..."]` header is used as the start
>   position of the move tree; (4) `[P]` markers are stripped from comments.
> - ChessPublica replaces a `<pgn>` element wholesale, so each game lives in a React-managed `div.cp-game`
>   (`dangerouslySetInnerHTML`) inside a collapsible `GameBox` (`src/components/ArticleBody.tsx`). Content stays in the
>   DOM while collapsed so boards are drawn at their real width.
> - Curly quotes: applied to article prose and to PGN comments only, never to move text (`src/lib/curly-dom.ts`).

---

# ChessPublica quirks this site works around

The site renders games with [ChessPublica](https://chesspublica.github.io/), loaded unpinned from its CDN.
Everything below was verified by reading its bundle (`ChessPublica.all.min.js`) and testing in a browser.
It relies on undocumented behavior, so after ChessPublica changes, walk through this list.

Every access to its internals (`_engine`, `_variation`, `_loopRAF`, `_variationPlayTick`, `commentBox`) goes through
`_js/chesspublica/engine.js`, so a rename breaks one file.

## How a PGN block becomes a game

`_js/pgn/blocks.js` finds paragraphs that start with `[Tag "value"]` and replaces them with `<pgn>`,
`<fen>`, `<pgn-player>` or `<pgn-study>`. This must happen before ChessPublica's script runs, because
it scans the DOM once on load; `_includes/scripts.html` loads the site bundle first.

- ChessPublica replaces a `<pgn>` element wholesale and drops its attributes, so the block key
  (`data-pgn-block-key`) is also stamped on the wrapper it never touches.
- `<pgn>` never fires `cp-ready`. `<pgn-player>` and `<pgn-study>` do.
- Switching the view stores the choice in `sessionStorage` and reloads the page, since a block cannot
  change element type after the scan. `view-state.js` also stores which block to scroll back to
  (`pgn-center-pending`) and turns off native scroll restoration until then.
- A lone `[FEN]` header followed by a comment holding only `[%csl ...]` / `[%cal ...]` (`{ [%csl Ge5] [%cal Ge4b7] } *`)
  is a static `<fen>` diagram with highlights and arrows, not a game: a `{` starts movetext, so without this rule
  it became an empty `<pgn>` that rendered nothing. The comment is passed to `<fen>` as its last line.
- `<puzzle>` renders a bare flipped diagram with no move list, so FEN headers with movetext become `<pgn>`.
- A `[P]` marker makes a position a puzzle. Studies strip it (nobody expects a quiz mid-article); a puzzle
  opens in `<pgn-player>` and, if the first marker is on Black's move, gets `[Orientation "black"]`.

## Patches (`_js/chesspublica/`)

| File | Problem | Relied-on internals |
| --- | --- | --- |
| `localize.js` | Hardcoded English strings: study loading text, puzzle hint, "show solution" tooltip, "Puzzle solved!". The hint is rewritten via `textContent` on every position change, so appearance alone is not enough. "Puzzle solved!" is appended after a `<br>` only when the caption already holds the winning move's comment; then the generic line is dropped instead of translated. | `.pgn-study-loading-side p`, `.puzzle-hint-text`, `.puzzle-hint-btn`, `.cp-puzzle-caption-text` |
| `diagram-no-pause.js` | A `{[D]}` comment carries no text but ChessPublica treats it as content worth pausing for; the diagram is hidden under the board anyway. | `engine.commentBox.update(index, comments, variations, diagrams)` |
| `diagram-join.js` | After each inline diagram ChessPublica starts a new paragraph prefixed `N...`. Diagrams are hidden in a study, leaving `5. exd5` / `5... Qxd5` on separate lines. | `.pgn-mainline`, `.pgn-variation-line`, `.cp-board-wrapper`, `.comment-diagram` |
| `glyph-badge.js` | Clicking a move nested in a variation never refreshes the `.gm-badge` (stale badge, wrong square, or missing). Derived from the active move's trailing NAG and its `data-to` square. | `.pgn-move-active`, `data-to`, `.gm-badge` |
| `variation-fix.js` | Stepping inside a variation rebuilds `.video-comment` without the variation lists the reader clicked into. The live nodes are put back (they keep their handlers). Also: one play button that returns to the mainline, and leaving a variation before entering a sibling. | `engine.state.speed` (Space autoplay pace), `engine._variation` (`contentEl`, `mainStateIndex`), `exitVariation()`, `exitToParentVariation()`, `variationGoTo()`, `goTo()`, `play()` (also Space: plays on step by step, back into the parent line at a variation's end, until the end or the next action) |

## Study view (`_js/chesspublica/study/`)

- **Layout**: the column split is set through `--left-col-width` / `--right-col-width` only, never
  `grid-template-columns`, so the drag splitter keeps working.
- **No autoplay**: Play and speed are removed from the ribbon, Space is swallowed, and `_loopRAF` is
  replaced with a no-op and `_variationPlayTick` (the variation loop, started by clicking a move with
  sub-variations) with a single step. `play()` itself must stay: the branch picker's mainline row calls it for its single step.
  A board click also calls `togglePlay()`, and a second board listener treats two clicks within 300 ms as
  "jump 10 plies"; all board clicks are stopped in the capture phase.
- **Keyboard**: arrow keys only work when `.player-container` is partly in the viewport, and are sent to a
  page-wide "active engine" claimed by whichever player was built first (often an earlier puzzle). Before
  stepping, the container is scrolled into view and a `mouseenter` is dispatched on `.player-wrapper`.
- **Branch points**: ChessPublica's `goTo()` refuses a plain "next" at a branch until the picker's mainline row
  is clicked, and nothing outside its bundle can set the flag that click sets. `branch.js` clicks it, then
  undoes the `playing` state the click causes. Because the click already advances one ply, the same keydown
  must not also reach ChessPublica's handler (`stopImmediatePropagation`).
- **Comment mirror**: the active comment is mirrored into `.pgn-study-mobile-comment`. It is appended last,
  because inserting a sibling between the grid's three children breaks auto-placement, and kept last because the
  variation picker can be inserted anywhere. It is hidden by CSS.
- **Collapsing** is disabled by removing `pgn-study-collapsed` whenever it appears (the panel is click-to-expand).

## Scrolling after a view switch (`_js/lib/scroll.js`, `_js/pgn/pending-scroll.js`)

Every view switch reloads the page and then scrolls the block into place. Native scroll restoration is not
used: the page keeps growing while ChessPublica renders, so it lands anywhere (measured: the same click
ended up 0 or 1257 px away depending on timing). A study centers itself; a player waits for `cp-ready` and
aligns to the top.

Piece images load after `cp-ready` and keep changing the panel height, so the scroll target is computed only
after every image has loaded or failed (3 s cap). A single `scrollTo` is not reliable: something moves the page
back to the top within a frame to a second later, so the target is re-applied every frame for a second, and
dropped as soon as the reader scrolls. A plain `<pgn>` has no ready signal and keeps appending content for a
long time (900+ mutations for a long game), so it waits for 300 ms without mutations (5 s cap) and aligns to the
top of the block rather than its middle.

Other blocks on the page (a study or player above the target) also change the page height while they render, so
the scroll waits for every `<pgn-player>`/`<pgn-study>` to be ready (`allElementsReady`), not only the target.

## CSS (`_css/chesspublica/`)

- ChessPublica centers `.fen-container` and `.cp-board-wrapper` only inside its own `max-width: 640px` query.
- `.pgn-comment` is a `<p>`, so `.post-body p { margin: 0 0 1em }` wins over its margin-top; its padding-top is
  only reset inside `pgn-study`.
- A standalone `<pgn-player>` has a flat 400px board and `width: fit-content`; `cqw` only resolves against a
  definite width, hence `width: 100%` below 52em. Inline diagrams are sized with `--diagram-max-width`
  (not `--board-size`, which `--small` would shrink again).
- `box-shadow` highlights (active comment, puzzle "your move") spread past the box and get clipped by
  `overflow-x`; a few pixels of padding give them room.
- The dark-mode splitter handle uses `color-mix()` to be opaque: two stacked translucent fills of the same
  color show as a seam.
- `!important` appears exactly three times (`icons.css`, `player.css`), each to override an `--icon` custom
  property that ChessPublica sets in an inline `style`, which nothing else can beat.

## Flip puzzle: events added to `pgn-player.js` (patched here, `src/components/FlipGame.tsx`)
Two additions to `public/chesspublica/pgn-player.js`, both marked `Site patch` in the file:
- the existing `cp-move` event now carries `detail.gameOver` (the last move and its comment are showing);
- `PuzzleMode._notify()` dispatches a bubbling `cp-puzzle` event on the player for main-line puzzles: `step` (the solver's
  move was found), `reply` (the opponent's forced reply), `wrong` (a move that is not the solution; `detail.attempt` is its SAN) and
  `solved`. `detail` has the SAN, glyph, move number/colour, the comment and the side variations anchored at that move.
`FlipGame` (a `[Frame "quote"]` game with `[Flip "puzzle"]` + the next game with the same players/date) uses them: the first game is a
`<pgn-player>` (White's side), the second the puzzle (`{[Pn]}`, Black's side) stacked behind it; when the first player is on its last move
the player's replay button (`.comment-play-btn`, re-created by ChessPublica on every render, so a MutationObserver converts it: `cloneNode` drops its `onclick`, icon `circle-play`) becomes a play button and pressing it flips the card (never automatically), and the puzzle's comments are written under it as moves are found, or when a
move that starts a variation in the analysis is tried. (Superseded: the move comments are shown by the player itself, see below; `FlipGame` only adds the variation lines.)
Main-line puzzles also use the player's own comment box (patch `PuzzleMode._showComment`/`_playReply`): after the solver's correct move the comment of that move, if any, is shown with a Play button at its end and the opponent's reply waits for it; no comment = the reply follows after 300 ms as before. The reply's own comment is shown with the reply, the box is cleared on positions without a comment, and after the last solver move `_finish()` resumes normal playback (final comment + Replay). The puzzle's own comment box (lead sentence in `{[Pn] …}`) is hidden once solved.
If ChessPublica fails to load, both games are drawn one after the other without the flip. Re-check these hooks if `pgn-player.js` is replaced.

## Illegal move lines in comments are shown as an error (patched here)
A parenthesised line that starts with a move number inside a `{ }` comment (`(21... Ne7 22. Nxb4)`) is played from the
comment's position and becomes a variation. Upstream, an illegal line was deleted without a trace; the bundle
(`Mt` in `ChessPublica.all.min.js`) and `pgn.js` (`renderInlinePgnReferences`) now emit `<mark>⚠ Geçersiz hamle dizisi: …</mark>`
instead (`.cp-game mark` in `src/site.css`, red). Seeing it means the line is wrong or placed on the wrong move.

## Strict SAN
`<pgn>` parses moves strictly: a redundant disambiguation (`Nfd6` when only one knight can reach d6) is `Error parsing PGN: Invalid move`, and
so is an ambiguous move (`Ne2` with two candidates). chess.js in its default lenient mode accepts both, so `scripts/check-games.mjs` uses
`strict: true`. `scripts/check-render.mjs` renders every article in a browser as a second safety net.

## Piece images are self-hosted
The bundle drew pieces from `https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png` (12 third-party requests on every first diagram).
`ChessPublica.all.min.js`, `helpers.js` and `pgn-player.js` now point to `/chesspublica/pieces/{piece}.png` (copies of those files; the
"Wikipedia" piece set is by Colin M.L. Burnett, CC BY-SA 3.0 / GFDL). The home page preloads the bundle and the 12 pieces when the browser is idle
(`preloadChessPublica` in `src/lib/chesspublica.ts`, called from `Index.tsx`), and `FenDiagram` needs only the base bundle (`useChessPublica(near, { player: false })`),
not the `<pgn-player>` module. The board stays hidden until the pieces are drawn; the placeholder says "Diyagram yükleniyor…".

### Puzzle resume after a gated comment
`PuzzleMode._finish(shown)` (site patch): when the solver's last move had a comment that was already read under the board (`_advance` → `_showComment`), pressing its Play button resumes playback from the *next* move (`state.index` + 1). Upstream sets the index one lower, so `play()` re-ran `goTo` on the same position, showed the same comment again with a new Play button and paused (Mar del Plata, Timman–Larsen: "Siyahın güçlü seçeneklerinden yalnızca biri." never went away).
