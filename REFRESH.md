# Updating the campaign each measurement round

All three views — **progress tracker**, **leaderboard**, and **race animation** —
are generated from one spreadsheet. You never edit code or `data.js` by hand.

## How the data flows

```
measurement photos ─(OCR, /update-round)─► Fat_Muscle_Measurements.xlsx
                                                     │
                                          (build_data.py)
                                                     ▼
                                                  data.js   ◄── generated, do not edit
                                                     │
                 ┌───────────────────────┬───────────┴───────────┐
                 ▼                        ▼                       ▼
           progress.html           leaderboard.html        index.html / race.html
```

`data.js` exposes `window.RACE`; all three pages render from it and re-rank
automatically. The number of rounds is detected from the spreadsheet, so adding
a round needs no code changes.

---

## Option A — from photos, one command (recommended)

When you have a new batch of scale screenshots:

1. Put the photos in a new subfolder under
   `…\Fat and Muscle\Measurements\`, named like the existing ones —
   e.g. **`5th progress`**.
2. **Close** `Fat_Muscle_Measurements.xlsx` in Excel.
3. In Claude Code (run from the project folder), type:

   ```
   /update-round
   ```

   Claude will: read each screenshot (name + body-fat % + muscle %), match
   nicknames to the roster, **show you a table to confirm or correct**, write the
   round into the spreadsheet, rebuild `data.js`, and push. Vercel redeploys in a
   minute or two.

The scale app shows nicknames (e.g. *Arm → Wason*, *Muay → Piyathida*). Known
ones live in `name_map.json`; the first time a new nickname appears, Claude asks
who it is and saves it there.

## Option B — type the numbers yourself

1. Add a sheet to the spreadsheet named like `5th Progress (8 Jun 26)` with
   columns `Name`, `Body Fat %`, `Muscle %`, one row per person measured (leave
   out anyone absent — they're carried forward automatically).
2. Save and close it, then from the repo run:

   ```powershell
   .\refresh.ps1 -Message "Round 5 data"
   ```

   (or manually: `python build_data.py` → `git add -A` → `git commit` → `git push`.)

---

## The pieces

| File | Role |
|------|------|
| `Fat_Muscle_Measurements.xlsx` | **source of truth** — one sheet per round |
| `build_data.py` | spreadsheet → `data.js` (computes scores/ranks for all rounds) |
| `write_round.py` | writes one round's confirmed readings into the spreadsheet |
| `name_map.json` | scale nickname → roster name |
| `.claude/commands/update-round.md` | the `/update-round` pipeline (OCR → review → write → publish) |
| `refresh.ps1` | copy spreadsheet → rebuild → commit → push |
| `data.js` | **generated** — never edit by hand |
| `progress.html`, `leaderboard.html`, `index.html`, `race.html` | render from `data.js` |

## Notes

- Things **not** in the spreadsheet live in `CONFIG` at the top of `build_data.py`:
  jersey colours, hair style, sex, and the planned date schedule
  (`STAGE_DATES` / `STAGE_FULL`). The dates shown on the site come from there — if
  a round's real date differs from the plan, update the matching entry.
- The track is drawn for `NUM_STAGES = 8` rounds. To go past P8, bump it and
  extend the schedule arrays.
- Live site: https://fat-and-muscle.vercel.app
  (`/progress.html`, `/leaderboard.html`, `/race.html`).
- Git work happens in the clone at `C:\Users\Admin\temp_esd\fat-and-muscle`
  (the OneDrive `deploy/` folder's `.git` is broken by OneDrive virtualisation).
