// Dia: a life's glass coin (a diatom), drawn on a canvas. The same seed always grows the same shell and the same life
// inside it. States: alive (green), asleep (amber, dim), dead (an empty grey shell), ascended (gold), unborn (faint).
(function () {
  'use strict';
  function seeder(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; }
  function rng(seed) { let a = seeder(String(seed)); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const PAL = {
    alive: { shell: [184, 255, 224], a: [46, 227, 127], b: [205, 255, 90], core: [228, 255, 238], glow: 1 },
    asleep: { shell: [236, 214, 170], a: [242, 176, 62], b: [255, 214, 120], core: [255, 236, 205], glow: .58 },
    dead: { shell: [150, 160, 172], a: null, glow: .42 },
    ascended: { shell: [255, 236, 190], a: [255, 206, 84], b: [255, 248, 205], core: [255, 255, 240], glow: 1.1 },
    unborn: { shell: [176, 236, 210], a: [46, 227, 127], b: [205, 255, 90], core: [228, 255, 238], glow: .62 },
  };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const mixc = (x, y, t) => [0, 1, 2].map(i => Math.round(x[i] + (y[i] - x[i]) * t));
  function genes(seed) {
    const r = rng(seed);
    const spokes = r() < .45 ? [12, 14, 16, 18, 20][Math.floor(r() * 5)] : 0;
    const nb = 4 + Math.floor(r() * 3), base = r() * Math.PI * 2, lobes = [];
    for (let k = 0; k < nb; k++) lobes.push({ ang: base + k * 2 * Math.PI / nb + (r() - .5) * .7, rad: .36 + r() * .19, sx: .15 + r() * .07, sy: .075 + r() * .035, tw: (r() - .5) * .6, mix: r(), dots: Array.from({ length: 4 }, () => [r() - .5, r() - .5, r()]) });
    return { spokes, lobes, dr: .042 + r() * .012, rot: r() * Math.PI * 2, ros: 5 + Math.floor(r() * 4), marg: 48 + Math.floor(r() * 4) * 6 };
  }
  // draw one life into a canvas of `size` CSS pixels (fill = radius of the shell as a share of the canvas)
  function paint(cv, seed, state, o) {
    o = o || {};
    const dpr = Math.min(2, window.devicePixelRatio || 1), css = o.size || cv.clientWidth || 200, S = Math.max(16, Math.round(css * dpr));
    if (cv.width !== S) { cv.width = S; cv.height = S; }
    const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, S, S);
    const g = genes(seed), P = PAL[state] || PAL.alive, c = S / 2, R = S * (o.fill || .36), G = P.glow, detail = R > 56;
    ctx.translate(c, c);
    let gr = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    gr.addColorStop(0, rgba(P.shell, .075 * G)); gr.addColorStop(.86, rgba(P.shell, .035 * G)); gr.addColorStop(1, rgba(P.shell, .09 * G));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    // the shell: rings of pores, brighter toward the rim
    if (detail) {
      const dr = g.dr * R, r0 = .16 * R; ctx.lineWidth = Math.max(.55, dr * .13);
      for (let j = 0, rj = r0; rj < .88 * R; j++, rj = r0 + j * dr) {
        const m = Math.max(8, Math.round(2 * Math.PI * rj / dr)), off = (j % 2) * .5, pr = (.40 - .13 * rj / R) * dr;
        ctx.strokeStyle = rgba(P.shell, (.12 + .30 * Math.pow(rj / R, 1.5)) * G); ctx.beginPath();
        for (let i = 0; i < m; i++) {
          const a = g.rot + (i + off) * 2 * Math.PI / m;
          if (g.spokes) { const f = (((a * g.spokes / (2 * Math.PI)) % 1) + 1) % 1; if (Math.min(f, 1 - f) * (2 * Math.PI / g.spokes) * rj < .02 * R) continue; }
          const x = Math.cos(a) * rj, y = Math.sin(a) * rj; ctx.moveTo(x + pr, y); ctx.arc(x, y, pr, 0, 7);
        }
        ctx.stroke();
      }
    }
    if (g.spokes) {
      ctx.strokeStyle = rgba(P.shell, .42 * G); ctx.lineWidth = Math.max(.7, .008 * R); ctx.beginPath();
      for (let k = 0; k < g.spokes; k++) { const a = g.rot + k * 2 * Math.PI / g.spokes; ctx.moveTo(Math.cos(a) * .13 * R, Math.sin(a) * .13 * R); ctx.lineTo(Math.cos(a) * .92 * R, Math.sin(a) * .92 * R); }
      ctx.stroke();
    }
    if (detail) { ctx.fillStyle = rgba(P.shell, .5 * G); ctx.beginPath(); for (let k = 0; k < g.marg; k++) { const a = g.rot + k * 2 * Math.PI / g.marg; ctx.moveTo(Math.cos(a) * .918 * R + .009 * R, Math.sin(a) * .918 * R); ctx.arc(Math.cos(a) * .918 * R, Math.sin(a) * .918 * R, .009 * R, 0, 7); } ctx.fill(); }
    // the rosette at the centre
    ctx.strokeStyle = rgba(P.shell, .55 * G); ctx.lineWidth = Math.max(.6, .006 * R); ctx.beginPath();
    for (let k = 0; k < g.ros; k++) { const a = g.rot + k * 2 * Math.PI / g.ros, x = Math.cos(a) * .072 * R, y = Math.sin(a) * .072 * R; ctx.moveTo(x + .022 * R, y); ctx.arc(x, y, .022 * R, 0, 7); }
    ctx.moveTo(.135 * R, 0); ctx.arc(0, 0, .135 * R, 0, 7); ctx.stroke();
    // the rim, with a little colour fringe like a real lens
    ctx.shadowColor = rgba(P.shell, .9 * G); ctx.shadowBlur = R * .07;
    ctx.strokeStyle = rgba(P.shell, .95 * G); ctx.lineWidth = Math.max(1.1, .014 * R); ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba(P.shell, .5 * G); ctx.lineWidth = Math.max(.7, .007 * R); ctx.beginPath(); ctx.arc(0, 0, .962 * R, 0, 7); ctx.stroke();
    if (detail) {
      ctx.lineWidth = Math.max(.6, .005 * R);
      ctx.strokeStyle = `rgba(255,120,110,${.16 * G})`; ctx.beginPath(); ctx.arc(0, 0, R * 1.008, 0, 7); ctx.stroke();
      ctx.strokeStyle = `rgba(110,160,255,${.16 * G})`; ctx.beginPath(); ctx.arc(0, 0, R * .99, 0, 7); ctx.stroke();
    }
    // the life inside: lobes joined to a bright core by thin strands
    if (P.a) {
      const lw = Math.max(1, .018 * R);
      ctx.shadowColor = rgba(P.a, .85); ctx.shadowBlur = R * .05;
      ctx.strokeStyle = rgba(P.a, .5 * G); ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
      for (const l of g.lobes) { ctx.moveTo(Math.cos(l.ang) * .12 * R, Math.sin(l.ang) * .12 * R); ctx.lineTo(Math.cos(l.ang) * l.rad * .72 * R, Math.sin(l.ang) * l.rad * .72 * R); }
      ctx.stroke();
      for (const l of g.lobes) {
        const col = mixc(P.a, P.b, l.mix * .8), x = Math.cos(l.ang) * l.rad * R, y = Math.sin(l.ang) * l.rad * R;
        ctx.save(); ctx.translate(x, y); ctx.rotate(l.ang + l.tw); ctx.scale(1, l.sy / l.sx);
        const lg = ctx.createRadialGradient(0, 0, 0, 0, 0, l.sx * R);
        lg.addColorStop(0, rgba(col, .62 * G)); lg.addColorStop(.6, rgba(col, .32 * G)); lg.addColorStop(1, rgba(col, 0));
        ctx.shadowBlur = 0; ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(0, 0, l.sx * R, 0, 7); ctx.fill();
        ctx.shadowBlur = R * .04; ctx.shadowColor = rgba(col, .9);
        ctx.strokeStyle = rgba(col, .62 * G); ctx.lineWidth = Math.max(.8, .011 * R) * l.sx / l.sy; ctx.beginPath(); ctx.arc(0, 0, l.sx * R * .86, 0, 7); ctx.stroke();
        if (detail) { ctx.shadowBlur = 0; ctx.fillStyle = rgba(P.b, .55 * G); for (const d of l.dots) { ctx.beginPath(); ctx.arc(d[0] * l.sx * R * .9, d[1] * l.sx * R * .9, (.006 + d[2] * .01) * R * l.sx / l.sy, 0, 7); ctx.fill(); } }
        ctx.restore();
      }
      ctx.shadowBlur = 0;
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, .28 * R);
      cg.addColorStop(0, rgba(P.core, 1 * G)); cg.addColorStop(.18, rgba(P.core, .75 * G)); cg.addColorStop(.45, rgba(P.a, .26 * G)); cg.addColorStop(1, rgba(P.a, 0));
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, .28 * R, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.setTransform(1, 0, 0, 1, 0, 0);
    // a soft bloom over the whole thing, where the browser can blur a canvas
    if (o.bloom !== false && 'filter' in ctx && detail) {
      try { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .42 * G; ctx.filter = `blur(${Math.round(R * .045)}px)`; ctx.drawImage(cv, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } catch {}
    }
    return g;
  }
  // a living one: drawn once, then it breathes and drifts; beat() makes its core flash (call it on a real trade)
  function live(cv, seed, state, o) {
    o = o || {};
    const base = document.createElement('canvas'); let st = state, flash = 0, raf = 0, t0 = performance.now(), visible = true;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function redraw() { paint(base, seed, st, { size: o.size || cv.clientWidth || 300, fill: o.fill }); cv.width = base.width; cv.height = base.height; frame(performance.now()); }
    function frame(now) {
      const ctx = cv.getContext('2d'), S = cv.width, P = PAL[st] || PAL.alive, t = (now - t0) / 1000;
      const breathe = st === 'dead' || calm ? 0 : Math.sin(t * (st === 'asleep' ? .9 : 1.6)) * (st === 'asleep' ? .006 : .009);
      const rot = st === 'dead' || calm ? 0 : t * .012;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, S, S);
      ctx.translate(S / 2, S / 2); ctx.rotate(rot); ctx.scale(1 + breathe, 1 + breathe); ctx.drawImage(base, -S / 2, -S / 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (P.a && flash > .01) {
        const R = S * (o.fill || .36), g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, R * (.35 + flash * .5));
        g.addColorStop(0, rgba(P.core, .9 * flash)); g.addColorStop(.3, rgba(P.a, .35 * flash)); g.addColorStop(1, rgba(P.a, 0));
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); ctx.globalCompositeOperation = 'source-over';
        flash *= .93;
      }
    }
    function loop(now) { if (visible && !document.hidden) frame(now); raf = requestAnimationFrame(loop); }
    redraw();
    if (!calm) raf = requestAnimationFrame(loop);
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(cv);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(redraw, 200); });
    return { beat(s) { flash = Math.min(1.2, flash + (s || .8)); if (calm) frame(performance.now()); }, set(s) { if (s !== st) { st = s; redraw(); } }, seed(sd) { seed = sd; redraw(); }, stop() { cancelAnimationFrame(raf); } };
  }
  // a still picture of a life, as a data URL (its token image)
  function picture(seed, state, px) {
    const cv = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
    paint(cv, seed, state || 'alive', { size: (px || 768) / dpr, fill: .34 });
    const out = document.createElement('canvas'); out.width = out.height = px || 768;
    const x = out.getContext('2d'); x.fillStyle = '#050706'; x.fillRect(0, 0, out.width, out.height);
    const g = x.createRadialGradient(out.width / 2, out.height / 2, 0, out.width / 2, out.height / 2, out.width * .5);
    g.addColorStop(0, 'rgba(46,227,127,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, out.width, out.height);
    x.drawImage(cv, 0, 0, out.width, out.height);
    return out.toDataURL('image/jpeg', .92);
  }
  const newSeed = () => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; const r = crypto.getRandomValues(new Uint8Array(10)); for (const b of r) s += a[b % a.length]; return s; };
  window.Dia = { paint, live, picture, genes, newSeed, PAL };
})();
