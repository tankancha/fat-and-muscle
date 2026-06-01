/* ============================================================
   Fat & Muscle Campaign — Stadium Race data model
   GENERATED FILE — do not edit by hand.
   Edit the spreadsheet, then run:  python build_data.py
   Combined score = (baselineFat - fat) + (muscle - baselineMuscle)
   Missed rounds carry forward the last-known reading.
   ============================================================ */
(function () {
  // Baseline = avg body-fat % / muscle % from sheet 'Baseline (16 Mar 26)'.
  const BASE = {
    Ohm: { sex: 'm', fat: 36.9, muscle: 59.7 },
    Maneenund: { sex: 'f', fat: 39.6, muscle: 56.8 },
    Wason: { sex: 'm', fat: 30.1, muscle: 66.2 },
    Pipat: { sex: 'm', fat: 21.9, muscle: 73.9 },
    Pruang: { sex: 'm', fat: 19.6, muscle: 76.1 },
    Nott: { sex: 'm', fat: 23.3, muscle: 72.6 },
    Orawan: { sex: 'f', fat: 37.6, muscle: 58.6 },
    Jue: { sex: 'm', fat: 29.2, muscle: 67 },
    Ann: { sex: 'm', fat: 24.5, muscle: 71.4 },
    Piyathida: { sex: 'f', fat: 22.75, muscle: 72.8 },
    Best: { sex: 'm', fat: 26.7, muscle: 69.5 },
    Sonny: { sex: 'm', fat: 21.15, muscle: 74.55 },
    Bob: { sex: 'm', fat: 32.7, muscle: 63.7 },
    Ben: { sex: 'm', fat: 27.4, muscle: 68.6 },
  };

  // Raw measurements per round (omitted name = missed that round).
  const RAW = {
    1: {  // missed: Wason, Best, Ben
      Ohm:[37,59.7], Maneenund:[39,57.3], Pipat:[21.9,74], Pruang:[19.6,76],
      Nott:[23.9,72.1], Orawan:[37.2,59], Jue:[28.8,67.4], Ann:[24.7,71.4],
      Piyathida:[23.1,72.5], Sonny:[20.8,74.8], Bob:[32.6,63.9],
    },
    2: {  // all present
      Ohm:[36.3,60.4], Maneenund:[39,57.3], Wason:[29.6,66.7], Pipat:[21,74.8],
      Pruang:[19.3,76.2], Nott:[22.7,73.1], Orawan:[36.5,59.7], Jue:[28.7,67.5],
      Ann:[24.6,71.3], Piyathida:[23.6,72], Best:[26,70.1], Sonny:[20.8,74.9],
      Bob:[31.9,64.4], Ben:[26.3,69.8],
    },
    3: {  // missed: Best
      Ohm:[36.1,60.5], Maneenund:[38.4,57.8], Wason:[30,66.4], Pipat:[20.9,74.9],
      Pruang:[19.9,75.7], Nott:[22.6,73.4], Orawan:[36.9,59.2], Jue:[29.3,67],
      Ann:[23.7,72.1], Piyathida:[23,72.6], Sonny:[20.7,75], Bob:[31.9,64.5],
      Ben:[26.2,69.8],
    },
    4: {  // missed: Ann, Sonny
      Ohm:[36.2,60.4], Maneenund:[38.4,57.9], Wason:[29.7,66.6], Pipat:[20.1,75.7],
      Pruang:[19.6,76.1], Nott:[22.1,73.8], Orawan:[36.3,60], Jue:[29.2,67],
      Piyathida:[22.5,73.1], Best:[25,71], Bob:[31.6,64.7], Ben:[26,70.1],
    },
  };

  const STYLE = {
    Ohm: { color: '#3B82F6', hair: 6 },
    Maneenund: { color: '#10B981', hair: 1 },
    Wason: { color: '#FB923C', hair: 8 },
    Pipat: { color: '#06B6D4', hair: 0 },
    Pruang: { color: '#A855F7', hair: 9 },
    Nott: { color: '#EF4444', hair: 3 },
    Orawan: { color: '#F97316', hair: 0 },
    Jue: { color: '#8B5CF6', hair: 10 },
    Ann: { color: '#6366F1', hair: 5 },
    Piyathida: { color: '#84CC16', hair: 2 },
    Best: { color: '#14B8A6', hair: 1 },
    Sonny: { color: '#22D3EE', hair: 7 },
    Bob: { color: '#F59E0B', hair: 4 },
    Ben: { color: '#EC4899', hair: 2 },
  };

  const NUM_STAGES = 8;
  const FINISH_SCORE = 6.0;
  const STAGE_LABELS = ['Baseline', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
  const STAGE_DATES = ['16 Mar', '31 Mar', '20 Apr', '5 May', '19 May', '8 Jun', '22 Jun', '6 Jul', '20 Jul'];
  const STAGE_FULL = [
    'Baseline · 16 Mar 2026',
    '1st progress · 31 Mar 2026',
    '2nd progress · 20 Apr 2026',
    '3rd progress · 5 May 2026',
    '4th progress · 19 May 2026',
    '5th progress · 8 Jun 2026',
    '6th progress · 22 Jun 2026',
    '7th progress · 6 Jul 2026',
    'Final · 20 Jul 2026',
  ];

  // ----- model (frozen; computed in the browser) -----------------------------
  const NAMES = Object.keys(BASE);
  // Most recent round that has data — drives ranking and the "now" marker.
  const LATEST = Object.keys(RAW).length
    ? Math.max(...Object.keys(RAW).map(Number)) : 0;
  const score = (b, fat, mus) => (b.fat - fat) + (mus - b.muscle);

  // Per-stage record for each athlete (stage 0 = Baseline, 1..NUM_STAGES = rounds).
  // Missed rounds carry forward the athlete's last-known reading; rounds with no
  // sheet yet are marked future (null) and drawn as empty track.
  const athletes = NAMES.map((name) => {
    const b = BASE[name];
    const stages = [];
    let last = { fat: b.fat, muscle: b.muscle };
    stages.push({ fat: b.fat, muscle: b.muscle, carried: false, present: true, score: 0 });
    for (let s = 1; s <= NUM_STAGES; s++) {
      if (s <= LATEST) {
        const m = RAW[s] && RAW[s][name];
        if (m) {
          last = { fat: m[0], muscle: m[1] };
          stages.push({ fat: m[0], muscle: m[1], carried: false, present: true,
                        score: score(b, m[0], m[1]) });
        } else {
          stages.push({ fat: last.fat, muscle: last.muscle, carried: true, present: false,
                        score: score(b, last.fat, last.muscle) });
        }
      } else {
        stages.push({ fat: null, muscle: null, carried: false, present: false, score: null, future: true });
      }
    }
    return { name, sex: b.sex, base: b, style: STYLE[name], stages };
  });

  // Ranks per measured stage (1 = best). Ties broken by fat lost, then name.
  const ranks = [];
  for (let s = 0; s <= LATEST; s++) {
    const order = athletes
      .map((a) => ({ name: a.name, sc: a.stages[s].score,
                     fatLost: a.base.fat - a.stages[s].fat }))
      .sort((x, y) => (y.sc - x.sc) || (y.fatLost - x.fatLost) || x.name.localeCompare(y.name));
    const r = {};
    order.forEach((o, i) => { r[o.name] = i + 1; });
    ranks.push(r);
  }

  window.RACE = {
    athletes, ranks, NUM_STAGES, LATEST, FINISH_SCORE, NAMES,
    STAGE_LABELS, STAGE_DATES, STAGE_FULL,
  };
})();
