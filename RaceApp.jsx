/* ============================================================
   RaceApp — the stadium race.  Lanes reorder by rank; runners
   slide by combined transformation score. Auto-plays Baseline→P4,
   scrub/step any update, winner spotlight.
   ============================================================ */
const { useState, useEffect, useRef, useLayoutEffect, useMemo } = React;

const R = window.RACE;
const N = R.athletes.length;            // 14
const LATEST = R.LATEST;                // 4
const DESIGN_W = 1340;
const DESIGN_H = 868;

// ---- projection: finish line = leader's pace carried out to P7 -------------
const leaderScoreP4 = Math.max(...R.athletes.map((a) => a.stages[LATEST].score));
const PACE = leaderScoreP4 / LATEST;
const GOAL = PACE * R.NUM_STAGES;        // score at the P7 finish line
const xPct = (sc) => clamp((sc / GOAL) * 100, 0, 100);

function fmt(n, d = 1) { return (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(d); }

// rank info for a given stage (0..LATEST)
function standings(stage) {
  return R.athletes.map((a) => {
    const st = a.stages[stage];
    const prev = stage > 0 ? R.ranks[stage - 1][a.name] : null;
    const rank = R.ranks[stage][a.name];
    const dRank = prev ? prev - rank : 0;     // + climbed
    const prevScore = stage > 0 ? a.stages[stage - 1].score : 0;
    return {
      a, rank, dRank,
      score: st.score,
      carried: st.carried,
      dScore: st.score - prevScore,
      fatLost: a.base.fat - st.fat,
      muscleGain: st.muscle - a.base.muscle,
    };
  });
}

function MovementArrow({ d }) {
  if (d > 0) return <span className="delta up">▲{d}</span>;
  if (d < 0) return <span className="delta down">▼{-d}</span>;
  return <span className="delta flat">—</span>;
}

function ordinal(n) {
  if (n === 1) return '1st'; if (n === 2) return '2nd'; if (n === 3) return '3rd';
  return n + 'th';
}

function Lane({ row, laneIndex, laneH, runnerSize, stage, moving, continuous, slotRef }) {
  const { a, rank, dRank, score, carried } = row;
  const top = laneIndex * laneH;            // FIXED lane — never re-orders vertically
  const cls = ['lane'];
  if (rank === 1) cls.push('firstplace');

  // while playing continuously, cadence + run state track the segment being traversed;
  // when scrubbing, they track the change into the current measurement.
  const nextStage = Math.min(stage + 1, LATEST);
  const segDelta = a.stages[nextStage].score - a.stages[stage].score;
  const useDelta = continuous ? segDelta : row.dScore;
  const runDur = lerp(0.62, 0.30, clamp(Math.abs(useDelta) / 1.0, 0, 1));
  const isRunning = moving && (continuous
    ? Math.abs(segDelta) > 0.001
    : (stage > 0 && !carried && Math.abs(row.dScore) > 0.001));
  const resting = moving && !isRunning && stage > 0;

  return (
    <div className={cls.join(' ')} style={{ top: top + 'px', height: laneH + 'px' }}>
      <div className="gutter">
        <div className="lanedot" style={{ background: a.style.color, boxShadow: `0 0 7px ${a.style.color}` }}></div>
        <div className="meta">
          <div className="nm">
            <span className="nmtxt">{a.name}</span>
            <span className={'sx ' + a.sex}>{a.sex === 'f' ? 'F' : 'M'}</span>
            {rank === 1 && <span className="leadstar">★</span>}
          </div>
          <div className="row2">
            <span className="scorepill">{fmt(score)}</span>
            <span className="ranknow">{ordinal(rank)}</span>
            {stage > 0 && <MovementArrow d={dRank} />}
            {carried && <span className="missedtag">carried</span>}
          </div>
        </div>
      </div>
      <div className="lanerun" style={{ position: 'absolute', left: 'var(--gutter)', right: 'var(--padR)', top: 0, bottom: 0 }}>
        <div className={'runslot' + (isRunning ? ' moving' : '')} ref={slotRef}
             style={{ left: xPct(score) + '%', width: runnerSize + 'px' }}>
          <div className="dust"></div>
          {resting && <span className="rested">z</span>}
          <AnimeRunner
            sex={a.sex} fat={a.stages[stage].fat} muscle={a.stages[stage].muscle}
            baseFat={a.base.fat} baseMuscle={a.base.muscle}
            color={a.style.color} hair={a.style.hair}
            running={isRunning} runDur={runDur}
            size={runnerSize} leader={rank === 1}
          />
        </div>
      </div>
    </div>
  );
}

function Decor() {
  // yard lines at integer score increments
  const yards = [];
  for (let s = 1; s < GOAL; s++) {
    yards.push(
      <div className="yard" key={s} style={{ left: xPct(s) + '%' }}>
        <span className="yl">+{s}</span>
      </div>
    );
  }
  // projected milestone flags for the upcoming updates
  const flags = [];
  for (let p = LATEST + 1; p <= R.NUM_STAGES; p++) {
    const projected = PACE * p;
    const isFin = p === R.NUM_STAGES;
    flags.push(
      <div className={'flag' + (isFin ? ' fin' : '')} key={p} style={{ left: xPct(projected) + '%' }}>
        <span className="pennant">{isFin ? 'Finish · Final 20 Jul' : R.STAGE_LABELS[p] + ' · ' + R.STAGE_DATES[p]}</span>
        <span className="pole"></span>
      </div>
    );
  }
  return (
    <div className="decor" style={{ position: 'absolute', left: 'var(--gutter)', right: 'var(--padR)', top: 0, bottom: 0, zIndex: 1, pointerEvents: 'none' }}>
      {yards}
      <div className="startline" style={{ left: '0%' }}></div>
      <div className="finishline" style={{ left: 'calc(100% - 6px)' }}></div>
      {flags}
    </div>
  );
}

function Timeline({ stage, onSeek }) {
  return (
    <div className="tl-track">
      <div className="tl-fill" style={{ width: (stage / R.NUM_STAGES) * 100 + '%' }}></div>
      {R.STAGE_LABELS.map((lab, i) => {
        const future = i > LATEST;
        const left = (i / R.NUM_STAGES) * 100;
        const cls = ['tl-node'];
        if (i === stage) cls.push('current');
        else if (i < stage) cls.push('done');
        if (future) cls.push('future');
        return (
          <button key={i} className={cls.join(' ')} style={{ left: left + '%' }}
                  disabled={future} onClick={() => !future && onSeek(i)} title={R.STAGE_FULL[i]}>
            <span className="tl-dot"></span>
            <span className="lab">{lab}</span>
            <span className="dt">{R.STAGE_DATES[i]}</span>
          </button>
        );
      })}
    </div>
  );
}

function WinnerCard({ row, onClose }) {
  const { a, score, fatLost, muscleGain } = row;
  const st = a.stages[LATEST];
  return (
    <div className="spotlight on">
      <div className="spot-scrim" onClick={onClose}></div>
      <div className="beam"></div>
      <div className="winnercard">
        <button className="winclose" onClick={onClose}>×</button>
        <span className="crown">👑</span>
        <div className="wfig">
          <AnimeRunner sex={a.sex} fat={st.fat} muscle={st.muscle}
            baseFat={a.base.fat} baseMuscle={a.base.muscle}
            color={a.style.color} hair={a.style.hair} running={true} runDur={0.34}
            size={130} leader={true} />
        </div>
        <div className="winfo">
          <div className="elabel">Current leader · after 4 of 8 updates</div>
          <h2>{a.name} <span className={'sx ' + a.sex} style={{ fontSize: 12 }}>{a.sex === 'f' ? 'F' : 'M'}</span></h2>
          <div className="wsub">Leading the Fat &amp; Muscle campaign on combined transformation score.</div>
          <div className="winstats">
            <div className="ws"><div className="k">Combined score</div><div className="v g">{fmt(score)}</div></div>
            <div className="ws"><div className="k">Body fat lost</div><div className="v g">−{fatLost.toFixed(1)}<span style={{ fontSize: 12 }}>pp</span></div></div>
            <div className="ws"><div className="k">Muscle gained</div><div className="v g">+{muscleGain.toFixed(1)}<span style={{ fontSize: 12 }}>pp</span></div></div>
            <div className="ws"><div className="k">Now</div><div className="v">{st.fat.toFixed(1)}<span style={{ fontSize: 12 }}>% / </span>{st.muscle.toFixed(1)}<span style={{ fontSize: 12 }}>%</span></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RaceApp() {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [moving, setMoving] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const [spotlight, setSpotlight] = useState(false);
  const [laneH, setLaneH] = useState(46);
  const [scale, setScale] = useState(1);
  const lanesRef = useRef(null);
  const moveTimer = useRef(null);
  const spotTimer = useRef(null);
  // continuous-playback refs
  const slotEls = useRef({});      // athlete name -> runslot DOM node
  const rafRef = useRef(0);
  const playStart = useRef(0);     // performance.now() when this run leg began
  const playFrom = useRef(0);      // playhead value (0..LATEST) at leg start
  const lastFloor = useRef(0);
  const SEG = 2350;                // ms to travel one measurement-to-measurement segment

  const setSlot = (name, el) => { if (el) slotEls.current[name] = el; };

  // scale the fixed design canvas to fit the viewport
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // measure lane container
  useLayoutEffect(() => {
    const el = lanesRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const h = el.clientHeight;
      if (h > 0) setLaneH(h / N);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- manual (scrub / step): discrete glide via CSS transition ----
  const goStage = (s) => {
    clearTimeout(spotTimer.current);
    setSpotlight(false);
    setMoving(true);
    setStage(s);
    clearTimeout(moveTimer.current);
    moveTimer.current = setTimeout(() => setMoving(false), 1950);
  };

  // ---- continuous playback: interpolate every runner's position each frame ----
  const tick = () => {
    let p = playFrom.current + (performance.now() - playStart.current) / SEG;
    if (p > LATEST) p = LATEST;
    const lo = Math.min(Math.floor(p), LATEST);
    const hi = Math.min(lo + 1, LATEST);
    const f = p - lo;
    for (const a of R.athletes) {
      const sc = lerp(a.stages[lo].score, a.stages[hi].score, f);
      const el = slotEls.current[a.name];
      if (el) el.style.left = xPct(sc) + '%';
    }
    if (lo !== lastFloor.current) { lastFloor.current = lo; setStage(lo); }
    if (p >= LATEST) { endRun(); return; }
    rafRef.current = requestAnimationFrame(tick);
  };
  const startRun = (from) => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(spotTimer.current);
    setSpotlight(false);
    playFrom.current = from;
    lastFloor.current = Math.floor(from);
    playStart.current = performance.now();
    setStage(Math.floor(from));
    setContinuous(true);
    setMoving(true);
    setPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  };
  const endRun = () => {
    cancelAnimationFrame(rafRef.current);
    lastFloor.current = LATEST;
    setContinuous(false);
    setMoving(false);
    setPlaying(false);
    setStage(LATEST);
  };
  const pauseRun = () => {
    cancelAnimationFrame(rafRef.current);
    let p = playFrom.current + (performance.now() - playStart.current) / SEG;
    p = clamp(p, 0, LATEST);
    const nearest = Math.round(p);
    lastFloor.current = nearest;
    setContinuous(false);   // re-enable CSS transition so runners settle onto the nearest measurement
    setMoving(false);
    setPlaying(false);
    setStage(nearest);
  };
  const halt = () => { cancelAnimationFrame(rafRef.current); setContinuous(false); setPlaying(false); };

  // kick off the continuous autoplay once, after first paint
  useEffect(() => {
    const t = setTimeout(() => startRun(0), 700);
    return () => { clearTimeout(t); cancelAnimationFrame(rafRef.current); };
  }, []);

  const rows = useMemo(() => standings(stage), [stage]);
  const leader = rows.find((r) => r.rank === 1);
  const biggestMover = useMemo(() => {
    if (stage === 0) return null;
    return rows.slice().sort((x, y) => y.dRank - x.dRank)[0];
  }, [rows, stage]);
  const missedCount = rows.filter((r) => r.carried).length;

  const runnerSize = Math.max(38, laneH * 0.82);

  const togglePlay = () => {
    if (playing) { pauseRun(); return; }
    startRun(stage >= LATEST ? 0 : stage);
  };
  const step = (dir) => {
    halt();
    const ns = clamp(stage + dir, 0, LATEST);
    if (ns !== stage) goStage(ns); else setMoving(false);
  };

  return (
    <div className="fitroot">
    <div className="scalebox" style={{ width: DESIGN_W * scale + 'px', height: DESIGN_H * scale + 'px' }}>
    <div className="app" style={{ width: DESIGN_W + 'px', height: DESIGN_H + 'px', transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      {/* top bar */}
      <div className="topbar">
        <div className="brand">
          <div className="mark">in</div>
          <div>
            <h1>Fat &amp; Muscle Campaign</h1>
            <div className="sub">Stadium leaderboard race</div>
          </div>
        </div>
        <div className="topstats">
          <div className="tstat"><div className="k">Leader</div><div className="v lead">{leader ? leader.a.name : '—'}</div></div>
          <div className="tstat"><div className="k">Top score</div><div className="v lead">{leader ? fmt(leader.score) : '—'}</div></div>
          <div className="tstat"><div className="k">Biggest climb</div><div className="v">{biggestMover && biggestMover.dRank > 0 ? `${biggestMover.a.name} ▲${biggestMover.dRank}` : '—'}</div></div>
          <div className="tstat"><div className="k">Missed this update</div><div className="v">{stage === 0 ? '—' : missedCount}</div></div>
        </div>
      </div>

      {/* stadium stage */}
      <div className="stage">
        <div className="sky">
          {[14, 38, 62, 86].map((l, i) => (
            <React.Fragment key={i}>
              <div className="pylon" style={{ left: l + '%' }}></div>
              <div className="lamp" style={{ left: `calc(${l}% - 28px)` }}></div>
            </React.Fragment>
          ))}
        </div>
        <div className="stands"></div>

        <div className="trackwrap">
          <div className="track">
            <Decor />
            <div className="lanelines" style={{ position: 'absolute', left: 'var(--gutter)', right: 0, top: 0, bottom: 0, zIndex: 1, pointerEvents: 'none' }}>
              {R.athletes.map((_, i) => (
                <div key={i} className={'laneline' + (i % 2 ? ' alt' : '')}
                     style={{ top: i * laneH + 'px', height: laneH + 'px' }}></div>
              ))}
            </div>
            <div className={'lanes' + (continuous ? ' continuous' : '')} ref={lanesRef}>
              {rows.map((row, i) => (
                <Lane key={row.a.name} row={row} laneIndex={i} laneH={laneH} runnerSize={runnerSize}
                      stage={stage} moving={moving} continuous={continuous}
                      slotRef={(el) => setSlot(row.a.name, el)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="controls">
        <button className="playbtn" onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
          {playing
            ? <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="2" width="3.6" height="12" rx="1" fill="currentColor"/><rect x="9.4" y="2" width="3.6" height="12" rx="1" fill="currentColor"/></svg>
            : (stage >= LATEST
              ? <svg width="17" height="17" viewBox="0 0 16 16"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" fill="none" stroke="currentColor" strokeWidth="1.6"/><path d="M11.5 1.5v3.2h-3.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg width="15" height="15" viewBox="0 0 16 16"><path d="M4 2.5l9 5.5-9 5.5z" fill="currentColor"/></svg>)}
        </button>
        <button className="stepbtn" onClick={() => step(-1)} disabled={stage === 0} title="Previous update">
          <svg width="14" height="14" viewBox="0 0 16 16"><path d="M10 3l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button className="stepbtn" onClick={() => step(1)} disabled={stage >= LATEST} title="Next update">
          <svg width="14" height="14" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <div className="nowlabel">
          <div className="k">Showing</div>
          <div className="v">{stage === 0 ? 'Baseline' : <>Update <em>{stage}</em> of {R.NUM_STAGES}</>}</div>
        </div>

        <div className="timeline">
          <Timeline stage={stage} onSeek={(i) => { halt(); goStage(i); }} />
        </div>

        <button className="spot-toggle" onClick={() => setSpotlight((s) => !s)}>
          <svg width="15" height="15" viewBox="0 0 16 16"><path d="M8 1l1.9 4.3L14 6l-3 3.1.8 4.6L8 11.6 4.2 13.7 5 9.1 2 6l4.1-.7z" fill="currentColor"/></svg>
          Winner spotlight
        </button>
      </div>

      {spotlight && leader && <WinnerCard row={leader} onClose={() => setSpotlight(false)} />}
    </div>
    </div>
    </div>
  );
}

window.RaceApp = RaceApp;
