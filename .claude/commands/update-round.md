---
description: OCR new measurement photos into the spreadsheet and publish all 3 views (progress, leaderboard, race)
argument-hint: "[round number or folder name] (optional)"
---

You are running the **measurement update pipeline** for the Fat & Muscle campaign.
A new batch of body-composition scale screenshots needs to be read, reviewed by
the user, written into the spreadsheet, and published to the website (which
updates the progress tracker, leaderboard, and race animation together).

## Fixed paths
- REPO (git working copy + scripts): `C:\Users\Admin\temp_esd\fat-and-muscle`
- MEASUREMENTS root: `C:\Users\Admin\OneDrive\Claude Cowork\03_Projects\Fat and Muscle\Measurements`
- SOURCE spreadsheet: `C:\Users\Admin\OneDrive\Claude Cowork\03_Projects\Fat and Muscle\Fat and Muscle\Fat_Muscle_Measurements.xlsx`
- Name map: `<REPO>\name_map.json`

User argument (may be empty): `$ARGUMENTS`

## Steps — follow in order

### 1. Pick the round + photo folder
- List the subfolders of MEASUREMENTS. The existing ones are Baseline, "1st Progress", "2nd progress", "3rd progress", "4th progress".
- If `$ARGUMENTS` names a folder or a round number, use that. Otherwise choose the folder for the **next** round that is not yet in the spreadsheet (read the spreadsheet's sheet names with a quick `python` + openpyxl call, or infer from the highest existing "Nth Progress" sheet). Confirm the chosen folder + round number with the user in one short line before proceeding.
- Determine the **round number** N from the folder name's leading ordinal (e.g. "5th progress" → 5).

### 2. OCR the photos (use a subagent to keep context clean)
- List the image files (`*.JPG`/`*.PNG`) in the chosen folder.
- Dispatch ONE general-purpose subagent (Agent tool) to read every image and return a JSON array. Give it this instruction verbatim, with the real absolute file paths:
  > These are screenshots from the Mija Body Composition Scale S400 app. For each image read: the NAME at the very top (next to the avatar; may be a nickname), the "Body fat percentage" (the % beside the BMI number in the Body score section), the "Muscle percentage" (labelled "Muscle percentage" in Body composition — NOT muscle mass kg, body water, protein %, skeletal muscle mass, or bone mineral %), and the date under the name. Return ONLY a JSON array: `[{"file":"...","name":"...","body_fat_pct":0.0,"muscle_pct":0.0,"date":"MM/DD/YYYY HH:MM"}]`, using null for anything unreadable.

### 3. Resolve names to the roster
- Read `name_map.json` (`map` = nickname→roster, `roster` = canonical names).
- For each OCR row, resolve the shown name: case-insensitive match to a roster name, else look it up in `map`.
- **Deduplicate** rows that resolve to the same person (some folders have a duplicate shot). If two shots for one person disagree on the numbers, surface both and ask which is correct.
- **Name rule (strict):** people sometimes log under a personal nickname. If any shown name is **not already a roster name or in `name_map.json`**, STOP and ask the user: "Photo says '<X>' (fat A%, muscle B%) — which participant is this?" Do NOT guess, and do NOT write anything to the spreadsheet until they clarify. After they answer, add `"<x_lowercased>": "<RosterName>"` to `name_map.json` `map` and continue. (A wrong name silently corrupts that person's trend and the rankings.)

### 4. Derive the date
- From the photos' date (e.g. `05/19/2026`) produce `date_label` like `19 May 26` and `title_date` like `19 May 2026`. If photos disagree, use the most common date.

### 5. REVIEW — pause for the user
Show a table: **Person | Body Fat % | Muscle % | source file**, sorted by roster. List which roster members are **absent** this round (no photo). Then ask the user to confirm or give corrections. **Do not proceed until they confirm.** Apply any edits they give.

### 6. Write to the spreadsheet
- Tell the user the SOURCE spreadsheet must be **closed in Excel**.
- Write the confirmed readings to `<REPO>\data\_round_input.json`:
  ```json
  {"round": N, "date_label": "19 May 26", "title_date": "19 May 2026",
   "readings": {"RosterName": [bodyFat, muscle], ...}}
  ```
- Run: `python "<REPO>\write_round.py" --json "<REPO>\data\_round_input.json"`
  (defaults to the SOURCE spreadsheet). If it reports the file is locked, ask the user to close Excel, then retry.

### 7. Publish (rebuild all 3 views + push)
- Run the refresh helper, which copies the spreadsheet into the repo, regenerates `data.js`, commits, and pushes:
  `powershell -File "<REPO>\refresh.ps1" -Message "Round N measurements"`
- (If `refresh.ps1` reports nothing changed, the round was already published.)

### 8. Report
- Delete `<REPO>\data\_round_input.json`.
- Tell the user the round is live and that Vercel will redeploy in a minute or two:
  - Landing + race: https://fat-and-muscle.vercel.app
  - Progress tracker: https://fat-and-muscle.vercel.app/progress.html
  - Leaderboard: https://fat-and-muscle.vercel.app/leaderboard.html
- Summarise: round number, how many measured / absent, and the new leader (top of `window.RACE.ranks[LATEST]`, or just note it from the leaderboard).

## Notes
- All three views read the single generated `data.js`, so one rebuild updates everything and re-ranks automatically.
- Never hand-edit `data.js` — it is generated. The spreadsheet is the source of truth.
- If `name_map.json` gained entries, `refresh.ps1` will commit them along with the data.
