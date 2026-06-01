/* ============================================================
   AnimeRunner — side-view chibi anime athlete, facing right.
   Build morphs from measurement data:
     • higher body-fat %  -> rounder torso / belly
     • higher muscle %    -> broader shoulders + thicker limbs
   Sex drives hair + silhouette. Jersey hue is per-athlete.
   Running cycle animates via CSS (.runner.run); pace = --run-dur.
   ============================================================ */
const { useMemo: _useMemoAR } = React;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function inv(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }

// hex (#rgb / #rrggbb) -> {h,s,l} so accents can derive from the exact jersey color
function hexToHsl(hex) {
  let c = String(hex).replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Hair path generator. Returns SVG markup behind + front of head.
function hair(variant, sex, hairColor, hx, hy, hr) {
  // hx,hy = head center; hr = head radius. Figure faces right.
  const back = [];   // drawn behind head
  const front = [];  // drawn over head (bangs/fringe)
  const dark = hairColor;
  if (sex === 'f') {
    if (variant === 0) {
      // long ponytail flowing back
      back.push(`<path d="M${hx - hr * 0.2} ${hy} q-${hr * 1.9} ${hr * 0.3} -${hr * 1.5} ${hr * 2.4} q${hr * 0.9} -${hr * 0.5} ${hr * 1.4} -${hr * 1.1} q-${hr * 0.2} ${hr * 0.9} ${hr * 0.2} ${hr * 1.3} q${hr * 0.5} -${hr * 0.9} ${hr * 0.5} -${hr * 2.0}Z" fill="${dark}"/>`);
    } else if (variant === 1) {
      // twin tails
      back.push(`<path d="M${hx - hr * 0.6} ${hy - hr * 0.2} q-${hr * 1.3} ${hr * 0.6} -${hr * 0.9} ${hr * 1.9} q${hr * 0.5} -${hr * 0.3} ${hr * 0.8} -${hr * 0.8} q${hr * 0.1} ${hr * 0.6} ${hr * 0.5} ${hr * 0.9} q${hr * 0.1} -${hr * 1.0} -${hr * 0.1} -${hr * 1.8}Z" fill="${dark}"/>`);
      back.push(`<path d="M${hx + hr * 0.5} ${hy - hr * 0.4} q${hr * 1.1} ${hr * 0.5} ${hr * 0.8} ${hr * 1.7} q-${hr * 0.4} -${hr * 0.3} -${hr * 0.7} -${hr * 0.7} q-${hr * 0.1} ${hr * 0.5} -${hr * 0.4} ${hr * 0.8}Z" fill="${dark}"/>`);
    } else {
      // long straight hair down the back
      back.push(`<path d="M${hx - hr * 0.3} ${hy - hr * 0.3} q-${hr * 1.5} ${hr * 0.4} -${hr * 1.2} ${hr * 2.1} q${hr * 0.7} -${hr * 0.2} ${hr * 1.3} -${hr * 0.4} q${hr * 0.3} -${hr * 1.0} ${hr * 0.0} -${hr * 1.7}Z" fill="${dark}"/>`);
    }
    // soft crown + side-swept bangs
    front.push(`<path d="M${hx - hr} ${hy - hr * 0.1} a${hr} ${hr} 0 0 1 ${hr * 2} 0 q-${hr * 0.3} -${hr * 0.6} -${hr * 1.0} -${hr * 0.55} q-${hr * 0.8} -${hr * 0.05} -${hr * 1.0} ${hr * 0.55}Z" fill="${dark}"/>`);
    front.push(`<path d="M${hx + hr * 0.5} ${hy - hr * 0.7} q${hr * 0.7} ${hr * 0.5} ${hr * 0.5} ${hr * 1.3} q-${hr * 0.4} -${hr * 0.5} -${hr * 0.9} -${hr * 0.7}Z" fill="${dark}"/>`);
  } else {
    const v = variant % 9;
    // crown cap common to all
    front.push(`<path d="M${hx - hr} ${hy} a${hr} ${hr} 0 0 1 ${hr * 2} 0 q-${hr * 0.2} -${hr * 0.7} -${hr} -${hr * 0.7} q-${hr * 0.8} 0 -${hr} ${hr * 0.7}Z" fill="${dark}"/>`);
    if (v === 0 || v === 3) {
      // spiky forward
      front.push(`<path d="M${hx - hr * 0.9} ${hy - hr * 0.4} l${hr * 0.4} -${hr * 0.7} l${hr * 0.35} ${hr * 0.5} l${hr * 0.45} -${hr * 0.8} l${hr * 0.4} ${hr * 0.6} l${hr * 0.5} -${hr * 0.6} l${hr * 0.3} ${hr * 0.7}Z" fill="${dark}"/>`);
    } else if (v === 1 || v === 6) {
      // swept fringe to the right
      front.push(`<path d="M${hx - hr} ${hy - hr * 0.1} q${hr * 0.5} -${hr * 0.9} ${hr * 1.5} -${hr * 0.85} q${hr * 0.6} 0 ${hr * 0.6} ${hr * 0.5} q-${hr * 0.6} -${hr * 0.35} -${hr * 1.2} -${hr * 0.1} q-${hr * 0.6} ${hr * 0.25} -${hr * 0.9} ${hr * 0.55}Z" fill="${dark}"/>`);
    } else if (v === 2 || v === 7) {
      // short buzz / neat — small side part
      front.push(`<path d="M${hx - hr * 0.9} ${hy - hr * 0.3} q${hr * 0.9} -${hr * 0.5} ${hr * 1.8} 0 q-${hr * 0.4} -${hr * 0.45} -${hr * 0.9} -${hr * 0.45} q-${hr * 0.5} 0 -${hr * 0.9} ${hr * 0.45}Z" fill="${dark}"/>`);
    } else if (v === 4 || v === 8) {
      // man-bun + undercut
      back.push(`<circle cx="${hx - hr * 0.7}" cy="${hy - hr * 0.85}" r="${hr * 0.42}" fill="${dark}"/>`);
      front.push(`<path d="M${hx - hr * 0.95} ${hy - hr * 0.1} q${hr * 0.5} -${hr * 0.75} ${hr * 1.6} -${hr * 0.55} q${hr * 0.4} ${hr * 0.1} ${hr * 0.45} ${hr * 0.4} q-${hr * 0.7} -${hr * 0.3} -${hr * 1.4} -${hr * 0.05}Z" fill="${dark}"/>`);
    } else {
      // wavy medium
      front.push(`<path d="M${hx - hr} ${hy - hr * 0.05} q${hr * 0.3} -${hr * 0.8} ${hr} -${hr * 0.8} q${hr * 0.7} 0 ${hr} ${hr * 0.8} q-${hr * 0.4} -${hr * 0.35} -${hr * 0.55} -${hr * 0.1} q-${hr * 0.2} -${hr * 0.4} -${hr * 0.45} -${hr * 0.05} q-${hr * 0.25} -${hr * 0.35} -${hr * 0.45} 0 q-${hr * 0.2} -${hr * 0.2} -${hr * 0.55} ${hr * 0.15}Z" fill="${dark}"/>`);
    }
  }
  return { back: back.join(''), front: front.join('') };
}

function AnimeRunner({ sex, fat, muscle, baseFat, baseMuscle, color, hair: hairVariant,
                       running = true, runDur = 0.5, size = 130, dim = false,
                       leader = false }) {
  // ---- build morph factors -----------------------------------------------
  const fatN = inv(fat, 18, 40);        // 0 lean .. 1 round  (pop range)
  const musN = inv(muscle, 56, 77);     // 0 .. 1 muscular
  const belly = lerp(2, 16, fatN);      // belly bulge px
  const torsoW = lerp(20, 30, fatN);    // torso core width
  const shoulderW = lerp(15, 24, musN); // shoulder half-width
  const limbW = lerp(7, 11.5, musN * 0.6 + fatN * 0.4); // limb thickness

  // exact per-athlete jersey color (from the campaign website), with a derived dark shade
  const { h, s, l } = hexToHsl(color);
  const jersey = color;
  const jerseyDk = `hsl(${h} ${Math.min(100, s)}% ${Math.max(8, l - 17)}%)`;
  const skin = sex === 'f' ? '#ffd9c0' : '#f2c6a0';
  const skinSh = sex === 'f' ? '#f0bfa2' : '#dba87f';
  const hairCol = sex === 'f'
    ? `hsl(${(h + 200) % 360} 45% 28%)`
    : `hsl(${(h + 180) % 360} 35% 20%)`;

  // geometry (viewBox 0 0 120 150) — facing right
  const cx = 58, headY = 30, headR = 21;
  const shoulderY = 56, hipY = 92;
  const H = hair(hairVariant, sex, hairCol, cx, headY, headR);

  const svg = `
<svg viewBox="0 0 120 150" width="${size}" height="${size * 1.25}" class="runner ${running ? 'run' : 'idle'}" style="--run-dur:${runDur}s; opacity:${dim ? 0.4 : 1}">
  ${leader ? `<ellipse cx="${cx}" cy="146" rx="34" ry="7" fill="hsl(${h} 90% 60% / 0.35)"/>` : `<ellipse cx="${cx}" cy="146" rx="26" ry="5" fill="rgba(0,0,0,0.35)"/>`}
  ${H.back}
  <!-- BACK leg + arm (behind torso) -->
  <g class="leg legB" style="transform-origin:${cx}px ${hipY}px">
    <rect x="${cx - limbW / 2}" y="${hipY - 2}" width="${limbW}" height="32" rx="${limbW / 2}" fill="${jerseyDk}"/>
    <rect x="${cx - limbW / 2}" y="${hipY + 26}" width="${limbW * 0.92}" height="26" rx="${limbW / 2}" fill="${skinSh}"/>
    <path d="M${cx - limbW / 2 - 1} ${hipY + 50} h${limbW + 7} a3 3 0 0 1 0 6 h-${limbW + 7}Z" fill="#2a2f3a"/>
  </g>
  <g class="arm armB" style="transform-origin:${cx + 2}px ${shoulderY}px">
    <rect x="${cx - limbW * 0.45}" y="${shoulderY - 2}" width="${limbW * 0.9}" height="24" rx="${limbW * 0.45}" fill="${jerseyDk}"/>
    <rect x="${cx - limbW * 0.42}" y="${shoulderY + 18}" width="${limbW * 0.84}" height="18" rx="${limbW * 0.42}" fill="${skinSh}"/>
  </g>

  <!-- TORSO (leaning forward into the run) -->
  <g class="torso">
    <path d="
      M${cx - shoulderW} ${shoulderY}
      q-2 -10 ${shoulderW * 0.5} -11
      q${shoulderW * 0.9} -1 ${shoulderW * 1.5} 9
      q${belly * 0.4} ${(hipY - shoulderY) * 0.4} ${belly * 0.2} ${(hipY - shoulderY) * 0.62}
      q2 12 -8 14
      q-${torsoW} 3 -${torsoW + belly * 0.3} -2
      q-6 -${(hipY - shoulderY) * 0.5} -2 -${hipY - shoulderY}
      Z" fill="${jersey}"/>
    <!-- belly shading shows body-fat -->
    <path d="M${cx + 4} ${shoulderY + 10} q${belly} ${(hipY - shoulderY) * 0.3} ${belly * 0.3} ${(hipY - shoulderY) * 0.55} q-${belly * 0.6} 4 -${belly} 0Z" fill="${jerseyDk}" opacity="0.5"/>
    <!-- jersey number stripe -->
    <rect x="${cx - shoulderW + 4}" y="${shoulderY + 8}" width="6" height="${hipY - shoulderY - 16}" rx="3" fill="rgba(255,255,255,0.55)"/>
  </g>

  <!-- neck + HEAD -->
  <rect x="${cx + 2}" y="${shoulderY - 12}" width="11" height="12" rx="5" fill="${skin}"/>
  <circle cx="${cx + 4}" cy="${headY}" r="${headR}" fill="${skin}"/>
  <!-- ear -->
  <circle cx="${cx - 4}" cy="${headY + 2}" r="4" fill="${skinSh}"/>
  ${H.front}
  <!-- face (looking right) : big anime eye, brow, mouth, blush -->
  <ellipse cx="${cx + 17}" cy="${headY + 4}" rx="2.6" ry="1.6" fill="hsl(${h} 60% 80% / 0.55)"/>
  <g class="eyes">
    <ellipse cx="${cx + 12}" cy="${headY}" rx="3.4" ry="4.6" fill="#fff"/>
    <circle cx="${cx + 12.6}" cy="${headY + 0.8}" r="2.7" fill="hsl(${h} 55% 30%)"/>
    <circle cx="${cx + 13.4}" cy="${headY - 0.4}" r="0.9" fill="#fff"/>
  </g>
  <path d="M${cx + 9} ${headY - 6} q3 -2 6 0" stroke="${hairCol}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <path d="M${cx + 17} ${headY + 9} q-3 2.5 -6 0.5" stroke="${skinSh}" stroke-width="1.4" fill="none" stroke-linecap="round"/>

  <!-- FRONT leg + arm -->
  <g class="leg legA" style="transform-origin:${cx}px ${hipY}px">
    <rect x="${cx - limbW / 2}" y="${hipY - 2}" width="${limbW}" height="32" rx="${limbW / 2}" fill="${jersey}"/>
    <rect x="${cx - limbW / 2}" y="${hipY + 26}" width="${limbW * 0.95}" height="26" rx="${limbW / 2}" fill="${skin}"/>
    <path d="M${cx - limbW / 2 - 1} ${hipY + 50} h${limbW + 8} a3 3 0 0 1 0 6 h-${limbW + 8}Z" fill="#3a4150"/>
    <path d="M${cx - limbW / 2 - 1} ${hipY + 53} h${limbW + 8}" stroke="hsl(${h} 80% 60%)" stroke-width="1.5"/>
  </g>
  <g class="arm armA" style="transform-origin:${cx + 2}px ${shoulderY}px">
    <rect x="${cx - limbW * 0.45}" y="${shoulderY - 2}" width="${limbW * 0.9}" height="24" rx="${limbW * 0.45}" fill="${jersey}"/>
    <rect x="${cx - limbW * 0.42}" y="${shoulderY + 18}" width="${limbW * 0.84}" height="18" rx="${limbW * 0.42}" fill="${skin}"/>
    <circle cx="${cx}" cy="${shoulderY + 37}" r="${limbW * 0.5}" fill="${skin}"/>
  </g>
</svg>`;
  return React.createElement('div', {
    className: 'runner-wrap',
    style: { width: size, height: size * 1.25, lineHeight: 0 },
    dangerouslySetInnerHTML: { __html: svg },
  });
}

window.AnimeRunner = AnimeRunner;
