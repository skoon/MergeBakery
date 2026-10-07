# Responsive UI — Implementation Plan (draft for review)

Goal: the UI stays readable and usable at text sizes of 100%, 125% and 150%, and on any phone, tablet or desktop window. Nothing is hidden, clipped or overlapping. The Oven and Pantry buttons (and Sell) become art with a text label.

## Status (Oct 4)

All six tasks are built on the branch `r1-measure-layout`. D1 to D5 went with the recommendations. The check script passes: 375 of 375 screens (5 viewports × 3 text sizes × 25 screens) have no clipped, off-screen or overlapping text, and the board keeps at least half the height in every one.

To run the check (with `npm run dev` running):

```
npm run ui-check
```

It saves a screenshot of every screen under `docs/ui-checks/` (ignored by git), writes `report.json` there, prints the board and icon sizes for each viewport, and exits with an error if any screen has a problem. In WSL, Chromium also needs `libasound2` (`sudo apt install libasound2`). To try a size by hand, use `bakery.ui({ textScale: 1.5, width: 320, height: 568 })` in the console; `bakery.ui()` puts it back.

Where the build differs from the tasks below:

- **D2, the half-height limit.** The bars are not capped and clipped. When they would take more than half the height, `chromeMetrics.ts` gives them a smaller `--ui-scale` of their own, so their text and icons shrink together (never below 75%). This only happens on the smallest phone (320×568) at 125% or more, or while an event runs.
- **HUD.** Always one row. Its text stops growing where five sections would no longer fit the width (about 130% on a 360 px phone).
- **Order cards.** Names are still cut short with an ellipsis. Cards have a minimum width in text units, so three fit at 150% and the strip scrolls sideways. Rewards stay on one line.
- **Event pill.** It now sits in the top bar under the orders, so the board starts below it. Before, it covered the board's top row.
- **Undo.** For the undo window the Sell button itself reads Undo, with the seconds left as a badge. A separate Undo button pushed `?` off the tray.
- **Pantry count.** A badge on the button's corner, like the Oven's, so the label stays one line.
- **Column width.** `min(720px, max(320px, 70dvh))`: 720 px on a tablet, a portrait column in a wide window.
- **Button art (T-R5).** All four tray buttons sit on the pixel plate. `?` has no separate icon: the glyph on the plate is its icon and label in one. Pressed buttons drop 1 px and darken. There is no disabled look, because no tray button is ever disabled.
- **Spacing.** The `--space-*` tokens are still fixed px; only icons, bars, badges and text scale.
- **Deliver.** The button is still a thin bar (about 20 px), but a press anywhere on its order card counts, so the tap area is the card (72×85 px on the smallest phone). A taller button would have taken height from the board. The check holds it to 44 px like the tray buttons.

Still open:

- The button art (T-R5) is built, but Scott has not signed it off. Review sheet: `scripts/art/buttons_sheet.png`.
- Nothing was checked on a real phone or outside Chromium. The layout uses container query units (`cqw`), which need Safari 16 or Firefox 110.
- A phone held sideways (for example 740×360) is not usable: the board gets about a quarter of the height. The installed app is locked to portrait.

## What is wrong today (found by reading the code)

1. **Fixed-height chrome.** `#hud` 56 px, `#counter` 104 px, `#tray` 80 px and `#nav` 56 px are fixed (`app.css`). Text scales with `--text-scale` (`tokens.css`), the boxes holding it don't, so at 150% the HUD labels, counter cards and tray buttons overflow and overlap.
2. **Two sources of truth.** `src/ui/layout.ts` repeats those four heights as TypeScript constants ("must match the CSS"), and the board is sized from them. Changing a CSS height without the constant silently breaks the board layout.
3. **Mixed units.** 78 `font-size` rules: most use the tokens, but many are `calc(0.75rem * var(--text-scale))`, and some are fixed (`navBar.css` deliberately ignores text scale, `counterStrip.css` badge `9px`). Icons and bars are fixed px (18 px, 10 px, 22 px in `counterStrip.css`). Only two `@media` rules exist, both at 380 px.
4. **Fixed column.** `#app` is `max-width: 480px`, centred. On a tablet or desktop the game is a 480 px strip, and nothing scales up.
5. **Plain buttons.** Oven (`kitchenSheet.ts`), Pantry (`pantryDrawer.ts`), Sell and `?` are text-only CSS boxes.

The board itself is already responsive (cell size comes from the space left over, and Pixi redraws on resize). It is the DOM around it that isn't.

## Approach

- **One layout, measured not assumed.** The board takes whatever space the HUD, counter, tray and nav actually occupy, read from the DOM with a `ResizeObserver`. No more height constants in `layout.ts`.
- **Chrome grows with text, within limits.** Bars use `min-height` plus padding in `em`, so they grow with the text. A cap keeps the board at 50% or more of the height; past that, text in the bars truncates with an ellipsis and the counter strip scrolls (it already scrolls sideways).
- **One scale for graphics.** A `--ui-scale` custom property, derived from the viewport (`clamp()` on the width and height of `#app`), sizes icons, bars and buttons. Everything that is px today moves to `calc(Npx * var(--ui-scale))` or `em`.
- **Tokens only.** Every font size goes through the four `--font-size-*` tokens, so one switch controls them all.

## Decisions I need from you

| #   | Question                                                                                                                                                                                             | My recommendation                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Wide windows: keep the 480 px column, widen it (to about 720 px and scale up), or fill the window?                                                                                                   | Widen the column to a cap of ~720 px and scale graphics with `--ui-scale`. A game board stretched across a 1920 px screen would look empty. |
| D2  | At 150% text on a small phone, the chrome could take most of the screen. Allow it to grow until the board has half the height, then truncate?                                                        | Yes (the approach above).                                                                                                                   |
| D3  | Nav tabs ignore text scale today so five fit on 320 px. Keep that, or let them scale and wrap to two lines?                                                                                          | Let them scale up to 125%, then clamp. Nav labels are short.                                                                                |
| D4  | Verification. The Playwright browser tool has no Chrome here, so I can't take screenshots. May I run `npx playwright install chromium` (about 150 MB, a dev tool only, not added to `package.json`)? | Yes. Otherwise you'd check every size by hand.                                                                                              |
| D5  | Button art style: pixel-art plate with an icon and a label under it (my recommendation, matches the item art), or text on a stretchable plate with no icon?                                          | Icon plus label. Art needs your approval like the other art.                                                                                |

## Tasks

Each is one branch, stacked, as before. T-R1 to T-R3 are code only; T-R5 is the art.

### T-R1 Measure, don't assume (the root fix)

- Remove `HUD_HEIGHT`, `COUNTER_HEIGHT`, `TRAY_HEIGHT`, `NAV_HEIGHT` from `layout.ts`. `computeBoardLayout` takes the board's available rectangle (top and bottom edges) as input.
- `boardView.ts` observes `#hud`, `#counter`, `#tray`, `#nav` and redraws when any changes size (text scale change, rotation, window resize).
- CSS: the bars switch from `height` to `min-height`, and the pantry drawer's `bottom` stops using `--tray-height`; the drawer anchors to the tray's top edge instead.
- Done when: `layout.test.ts` covers the new signature (a tall chrome shrinks the board; a short viewport doesn't produce a negative cell size), the board is correct at 100% text, and no height constants remain in TypeScript.

### T-R2 Text that fits at 100/125/150%

- Replace every `calc(Nrem * var(--text-scale))` and fixed `px` font size with a token (add `--font-size-xs` for the 0.65–0.75 rem cases).
- HUD: labels wrap or truncate with an ellipsis instead of overlapping; sections get `min-width: 0` and `overflow: hidden`.
- Counter strip: cards size to content up to a max width; the strip scrolls sideways, and its height is `min-height` with the chrome cap from D2.
- Nav tabs: per D3.
- Full-screen sheets (Kitchen, Staff, Recipes, Settings, Shop, Location, dialogue, discovery, event, help, away card, end card): `overflow-y: auto` with `max-height: 100%` so tall content scrolls instead of being cut off; buttons never sit in a scroll region's clipped area.
- Done when: at 150% on a 320×568 viewport, every screen and card on the checklist (T-R6) has no clipped or overlapping text.

### T-R3 Graphics scale with the viewport

- Add `--ui-scale` on `#app` (set from a `ResizeObserver` in `main.ts`, or pure CSS `clamp()` if that is enough), range about 0.85 to 1.5.
- Convert fixed-px icons, bars, badges, paddings and radii in the CSS files to `calc(… * var(--ui-scale))`. List: `counterStrip.css` (18 px, 10 px, 22 px, 9 px), `hud.css` min-widths, `pantryDrawer.css`, `sellBin.css`, `kitchenSheet.css`, `staffPanel.css`, `locationView.css`, portraits in `dialoguePlayer.css`.
- D1: raise `#app`'s `max-width` to the agreed cap and add a landscape rule: when the window is wider than tall, keep the portrait column centred (a side-by-side layout is out of scope).
- Pixi side: the board already scales; check the text sizes in `boardView.ts` (tier badge, cooldown, charge badge) and that `resolution` follows `devicePixelRatio` changes (zoom, moving between monitors).
- Done when: at 320, 360, 412, 768 and 1280 px wide the icons keep the same proportion to the text and the board.

### T-R4 Tray button layout

- The tray becomes a flex row of equal-weight buttons that can wrap or shrink: Pantry, Sell, Oven, `?`. Min tap target 44 px (a11y).
- Badges (Oven ready count, Pantry used/capacity) are positioned relative to the button so they don't overlap neighbours at 150%.
- Done when: the four buttons never overlap at any text scale, and each is at least 44×44 CSS px.

### T-R5 Button art

- New 9-slice pixel-art plate, `button-plate.png` (about 24×24, border-image so it stretches with text and with `--ui-scale`), plus icons: Oven (reuse or adapt `brick-oven.png`), Pantry (jar or shelf), Sell (reuse `coin-pouch.png`), `?`.
- Layout: icon above, label below; the label stays real text, so it scales, translates, and is read by screen readers.
- States: normal, pressed, drag-over (Pantry/Sell already have `data-dragging`), disabled.
- Art script `scripts/art/buttons.py`, review sheet as usual. **Needs your approval.**
- Done when: the three buttons use the plate and icons, and the `aria-label`s (e.g. "Oven, 2 ready") are unchanged.

### T-R6 Verification

- Checklist matrix: text 100/125/150% × viewports 320×568, 360×740, 412×915, 768×1024, 1280×720 × screens (board, Pantry drawer open, Kitchen, Staff, Recipes, Location, Shop, Settings, Help, a dialogue, discovery card, event sheet, away card, End card).
- With D4: a Playwright script takes a screenshot of each, saved under `docs/ui-checks/` (not committed unless you want them) so before/after can be compared. Without it, you get the checklist to walk through by hand.
- Add a dev helper `bakery.ui({ textScale, width })` to jump to a size quickly.
- Done when: every cell of the matrix is clean, and the bugs found are all fixed or listed.

## Order and size

T-R1 → T-R2 → T-R3 → T-R4 → T-R5 → T-R6. T-R1 and T-R2 fix the reported bug (overflow at larger text) and can be merged on their own. T-R3 and later are the polish.

## Risks

- Without a browser I can't see any of this. T-R6 depends on D4; until then everything is checked only by typecheck, tests and reading CSS.
- `layout.ts` is used by `boardView.ts`, `dropZones.ts` and the tests; changing its signature touches all three.
- Chrome that grows could push the Pantry drawer over the board on a short screen; T-R1 anchors it to the tray and caps its height.
- Not changed: `src/core/types.ts` (no contract change), save format, game data.
