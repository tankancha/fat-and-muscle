/* ============================================================
   Fat & Muscle Campaign — Stadium Race data model
   Combined transformation score = (baselineFat - fat) + (muscle - baselineMuscle)
   Missed measurements carry forward the participant's last-known reading.
   ============================================================ */
(function () {
  // sex: 'f' | 'm'.  Women: Orawan, Maneenund, Piyathida.
  // Each baseline = avg body-fat % / avg muscle % from the workbook.
  const BASE = {
    Ohm:       { sex: 'm', fat: 36.9,  muscle: 59.7  },
    Maneenund: { sex: 'f', fat: 39.6,  muscle: 56.8  },
    Wason:     { sex: 'm', fat: 30.1,  muscle: 66.2  },
    Pipat:     { sex: 'm', fat: 21.9,  muscle: 73.9  },
    Pruang:    { sex: 'm', fat: 19.6,  muscle: 76.1  },
    Nott:      { sex: 'm', fat: 23.3,  muscle: 72.6  },
    Orawan:    { sex: 'f', fat: 37.6,  muscle: 58.6  },
    Jue:       { sex: 'm', fat: 29.2,  muscle: 67.0  },
    Ann:       { sex: 'm', fat: 24.5,  muscle: 71.4  },
    Piyathida: { sex: 'f', fat: 22.75, muscle: 72.8  },
    Best:      { sex: 'm', fat: 26.7,  muscle: 69.5  },
    Sonny:     { sex: 'm', fat: 21.15, muscle: 74.55 },
    Bob:       { sex: 'm', fat: 32.7,  muscle: 63.7  },
    Ben:       { sex: 'm', fat: 27.4,  muscle: 68.6  },
  };

  // Raw measurements actually taken each progress (omitted = missed that week).
  // P1 (31 Mar–1 Apr): missed Wason, Best, Ben
  // P2 (20 Apr): all present
  // P3 (5 May): missed Best
  // P4 (19 May): missed Sonny, Ann
  const RAW = {
    1: {
      Piyathida:[23.1,72.5], Pipat:[21.9,74.0], Nott:[23.9,72.1], Ohm:[37.0,59.7],
      Orawan:[37.2,59.0], Jue:[28.8,67.4], Pruang:[19.6,76.0], Sonny:[20.8,74.8],
      Ann:[24.7,71.4], Maneenund:[39.0,57.3], Bob:[32.6,63.9],
    },
    2: {
      Ohm:[36.3,60.4], Pipat:[21.0,74.8], Jue:[28.7,67.5], Bob:[31.9,64.4],
      Piyathida:[23.6,72.0], Sonny:[20.8,74.9], Best:[26.0,70.1], Orawan:[36.5,59.7],
      Wason:[29.6,66.7], Ben:[26.3,69.8], Pruang:[19.3,76.2], Maneenund:[39.0,57.3],
      Nott:[22.7,73.1], Ann:[24.6,71.3],
    },
    3: {
      Wason:[30.0,66.4], Ben:[26.2,69.8], Bob:[31.9,64.5], Nott:[22.6,73.4],
      Ohm:[36.1,60.5], Orawan:[36.9,59.2], Pipat:[20.9,74.9], Piyathida:[23.0,72.6],
      Sonny:[20.7,75.0], Jue:[29.3,67.0], Maneenund:[38.4,57.8], Ann:[23.7,72.1],
      Pruang:[19.9,75.7],
    },
    4: {
      Wason:[29.7,66.6], Ben:[26.0,70.1], Best:[25.0,71.0], Bob:[31.6,64.7],
      Jue:[29.2,67.0], Maneenund:[38.4,57.9], Piyathida:[22.5,73.1], Nott:[22.1,73.8],
      Ohm:[36.2,60.4], Orawan:[36.3,60.0], Pipat:[20.1,75.7], Pruang:[19.6,76.1],
    },
  };

  // Per-athlete jersey color — EXACT values from the campaign website
  // (leaderboard.html: COLORS indexed by alphabetical participant order).
  const STYLE = {
    Pipat:     { color: '#06B6D4', hair: 0 },
    Best:      { color: '#14B8A6', hair: 1 },
    Ben:       { color: '#EC4899', hair: 2 },
    Orawan:    { color: '#F97316', hair: 0 },
    Nott:      { color: '#EF4444', hair: 3 },
    Maneenund: { color: '#10B981', hair: 1 },
    Bob:       { color: '#F59E0B', hair: 4 },
    Ann:       { color: '#6366F1', hair: 5 },
    Ohm:       { color: '#3B82F6', hair: 6 },
    Sonny:     { color: '#22D3EE', hair: 7 },
    Wason:     { color: '#FB923C', hair: 8 },
    Piyathida: { color: '#84CC16', hair: 2 },
    Pruang:    { color: '#A855F7', hair: 9 },
    Jue:       { color: '#8B5CF6', hair: 10 },
  };

  const NAMES = Object.keys(BASE);
  const NUM_STAGES = 8;            // P1..P8 (final = 20 Jul)
  const LATEST = 4;                // most recent measured update
  const score = (b, fat, mus) => (b.fat - fat) + (mus - b.muscle);

  // Build per-stage records (stage 0 = Baseline, 1..7 = progress updates).
  // For each athlete at each stage: fat, muscle, carried(bool), combined score.
  const athletes = NAMES.map((name) => {
    const b = BASE[name];
    const stages = [];
    // Stage 0 — baseline (everyone present, score 0)
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
          // missed — carry forward last-known reading
          stages.push({ fat: last.fat, muscle: last.muscle, carried: true, present: false,
                        score: score(b, last.fat, last.muscle) });
        }
      } else {
        // future update — no data yet
        stages.push({ fat: null, muscle: null, carried: false, present: false, score: null, future: true });
      }
    }
    return { name, sex: b.sex, base: b, style: STYLE[name], stages };
  });

  // Finish-line goal: a fixed campaign target the leader is chasing.
  // Chosen so the current leader sits a touch past the midpoint with road left to P7.
  const FINISH_SCORE = 6.0;

  // Compute ranks per measured stage (1 = best). Ties broken by fat lost, then name.
  const ranks = []; // ranks[stage] = { name: rankInt }
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
    STAGE_LABELS: ['Baseline', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'],
    STAGE_DATES: ['16 Mar', '31 Mar', '20 Apr', '5 May', '19 May', '8 Jun', '22 Jun', '6 Jul', '20 Jul'],
    STAGE_FULL: [
      'Baseline · 16 Mar 2026',
      '1st progress · 31 Mar 2026',
      '2nd progress · 20 Apr 2026',
      '3rd progress · 5 May 2026',
      '4th progress · 19 May 2026',
      '5th progress · 8 Jun 2026',
      '6th progress · 22 Jun 2026',
      '7th progress · 6 Jul 2026',
      'Final · 20 Jul 2026',
    ],
  };
})();
