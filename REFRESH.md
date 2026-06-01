# Updating the race with new measurement rounds

The Stadium Race animation is **driven entirely by the spreadsheet**. You never
edit code to add a round — you update the spreadsheet and regenerate `data.js`.

## How the data flows

```
Fat_Muscle_Measurements.xlsx  ──(build_data.py)──►  data.js  ──►  race.html
   (you edit this)                                  (generated)    (+ landing-page iframe)
```

- `data.js` is a **generated file** — do not edit it by hand.
- The race re-ranks itself automatically each round. The most recent round with
  data becomes the "now" position; rounds with no sheet yet show as empty track.

## Each measurement round

1. **Add a sheet** to the spreadsheet named like the existing ones:
   `5th Progress (8 Jun 26)`, then `6th Progress (...)`, etc.
   - Row 1: a title (anything)
   - Row 2: headers `Name`, `Body Fat %`, `Muscle %`
   - Then one row per athlete who was measured. **Leave out anyone who missed**
     that round — the race carries their previous reading forward automatically.
   - (A trailing `GROUP AVERAGE` row is fine; it's ignored.)

2. **Save and close** the spreadsheet.

3. **Refresh** — from this folder, run:

   ```powershell
   .\refresh.ps1 -Message "Round 5 data"
   ```

   That copies the spreadsheet in, regenerates `data.js`, commits, and pushes.
   Vercel redeploys within a minute or two and the animation updates.

### Manual alternative

```powershell
python build_data.py        # regenerate data.js
git add -A
git commit -m "Round 5 data"
git push
```

## Notes

- **Baseline** comes from the `Baseline (...)` sheet's *Avg Body Fat %* / *Avg
  Muscle %* columns. The athlete roster and display order come from that sheet.
- Things **not** in the spreadsheet live in `CONFIG` at the top of
  `build_data.py`: jersey colours, hair style, sex, and the planned date
  schedule (`STAGE_DATES` / `STAGE_FULL`). Edit those only if they change — e.g.
  if a round's actual date differs from the plan, update the matching schedule
  entry.
- The track is drawn for `NUM_STAGES = 8` rounds. To go beyond P8, bump
  `NUM_STAGES` and extend the schedule arrays in `build_data.py`.
- `build_data.py` prints which rounds it found and warns about unknown athletes
  or anyone missing a colour — watch its output when you run it.
