# Fat & Muscle Campaign — project guide

A static site tracking a 14-person body-composition challenge. Three views — a
**race animation**, a **progress tracker**, and a **leaderboard** — all generated
from one spreadsheet and published on Vercel.

- **Live:** https://fat-and-muscle.vercel.app — `.app`, not `.com`
  (`/progress.html`, `/leaderboard.html`, `/race.html`)
- **GitHub:** tankancha/fat-and-muscle (Vercel auto-deploys `main`)

## Where the repo lives (important)

Do all git work in the clone at **`C:\Users\Admin\temp_esd\fat-and-muscle`**, not
the OneDrive `deploy/` folder. The OneDrive `.git` is virtualised by OneDrive
(ReparsePoint) and git refuses to operate on it. Re-clone from GitHub if the
local clone is gone.

## Data flow — single source of truth

```
measurement photos ─(OCR via /update-round)─► Fat_Muscle_Measurements.xlsx
                                                       │
                                            (python build_data.py)
                                                       ▼
                                                   data.js   ◄── GENERATED, never hand-edit
                                                       │
                  ┌────────────────────────┬───────────┴───────────┐
                  ▼                         ▼                        ▼
            progress.html            leaderboard.html         index.html / race.html
```

- The spreadsheet (`data/Fat_Muscle_Measurements.xlsx` in the repo; master copy
  in OneDrive `…\Fat and Muscle\Fat_Muscle_Measurements.xlsx`) is the **only**
  place data is entered.
- `build_data.py` turns it into `data.js`, which exposes `window.RACE`
  (athletes, per-stage fat/muscle, scores, per-round ranks, stage labels/dates).
- **All three pages render from `window.RACE`** and re-rank automatically.
  `LATEST` (the current round) is derived from the progress sheets that exist —
  adding a round needs **no code changes**.
- **Never hand-edit `data.js` or put data into the HTML.** Edit the spreadsheet
  and rebuild.

## Files

| File | Role |
|------|------|
| `Fat_Muscle_Measurements.xlsx` | **source of truth** — `Baseline` sheet + one `Nth Progress (date)` sheet per round |
| `build_data.py` | spreadsheet → `data.js` (computes scores & ranks for every round) |
| `write_round.py` | writes one round's confirmed readings into the spreadsheet |
| `name_map.json` | scale-app nickname → roster name |
| `.claude/commands/update-round.md` | the `/update-round` pipeline (OCR → review → write → publish) |
| `refresh.ps1` | copy spreadsheet → rebuild `data.js` → commit → push |
| `data.js` | **generated** — do not edit |
| `index.html` / `race.html` | landing page (race as hero) / standalone race animation |
| `progress.html`, `leaderboard.html` | data-driven views |
| `ds/`, `AnimeRunner.jsx`, `RaceApp.jsx` | race animation assets |

## Adding a measurement round

**Preferred — from photos:** drop the new scale screenshots into a new
`Measurements\<Nth progress>\` folder, close the spreadsheet in Excel, and run
`/update-round` in Claude Code. It OCRs each screenshot, maps nicknames, shows a
review table for you to confirm, writes the round, rebuilds, and pushes.

**Manual:** add the `Nth Progress (date)` sheet yourself, then run
`.\refresh.ps1 -Message "Round N data"` (or `python build_data.py` → commit → push).

### ⚠️ Name handling rule (read before ingesting photos)

The Mija scale app shows whatever **nickname** each person set on their account,
and people sometimes log under a **personal nickname** that doesn't match the
roster (known examples: `Arm → Wason`, `Muay → Piyathida`, `Maneenun → Maneenund`,
stored in `name_map.json`).

**If OCR turns up ANY name that is not already a roster name or in `name_map.json`,
STOP and ask the user who it is — do not guess, and do not write anything to the
spreadsheet until they clarify.** A wrong name silently corrupts that person's
trend and the rankings. After the user confirms, add the mapping to
`name_map.json` so it's recognised next time. Always show the full review table
(person → fat % → muscle %) and get confirmation before writing.

## Measurement schedule

Baseline 16 Mar · R1 31 Mar · R2 20 Apr · R3 5 May · R4 19 May · **R5 ~8 Jun ·
R6 ~22 Jun · R7 ~6 Jul · Final ~20 Jul 2026**.

**Dates can drift** with people's availability — that's fine. The system aligns
rounds by **round number** (the sheet's ordinal), never by date. Don't block on
exact dates; just keep round numbers in order so the animation and rankings line
up. Displayed dates come from the `STAGE_DATES`/`STAGE_FULL` config in
`build_data.py` and are purely cosmetic — update them only if you want the shown
date to match reality.

## Design system

The site UI follows a **Nike-inspired** system (see the source brief at
`…\Claude Code\Design\awesome-design-md\design-md\nike\DESIGN.md`):

- Monochrome chrome: Nike Black `#111111`, white, and a grey scale
  (`#FAFAFA`/`#F5F5F5`/`#E5E5E5`/`#CACACB`/`#707072`). No UI gradients, **no
  shadows** (flat elevation), no hover lift.
- Massive **uppercase condensed display headlines** (line-height ~0.9); body in a
  Helvetica/Arial stack, weight 500 for interactive text. Pill buttons (30px).
- **Colour is reserved for the data** — the athletes are the "product colour":
  per-person avatar colours, fat = red, muscle = blue, podium gold/silver/bronze,
  green = improved / red = regressed. The UI itself stays greyscale.
- The race animation (`race.html`) keeps its own dark "stadium" design and acts
  as the full-bleed hero media on the landing page.

## Verifying changes

The site is static. To check a change: serve the repo
(`python -m http.server <port>`) and drive it with the Playwright MCP
(navigate + `browser_evaluate` to read the DOM / `window.RACE`). The race app and
the data pages all need HTTP (they `fetch` JSX / load `data.js`), so open them
over `http://localhost`, not `file://`.
