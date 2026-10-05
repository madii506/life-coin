// Ecg: a heart monitor strip. It only beats when a real trade comes in: a buy beats up, a sell beats down, bigger trades
// beat harder. With no trades it stays a flat line, which is exactly what a quiet coin looks like.
(function () {
  'use strict';
  const G = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
  const shape = t => -.13 * G(t, .22, .032) + .10 * G(t, .385, .011) - 1 * G(t, .44, .015) + .36 * G(t, .495, .016) - .25 * G(t, .70, .05);
  const COL = { alive: '#2ee37f', asleep: '#f2b445', dead: '#5d6763', ascended: '#ffd35c', unborn: '#3f8f66' };
  function Ecg(cv, o) {
    o = o || {};
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, dpr = 1, buf = new Float32Array(1), head = 0, queue = [], last = performance.now(), col = COL[o.state] || COL.alive, state = o.state || 'alive';
    const speed = o.speed || 70, beats = [];
    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1); const w = cv.clientWidth || 300, h = cv.clientHeight || 80;
      if (Math.round(w * dpr) === cv.width && Math.round(h * dpr) === cv.height) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); W = w; H = h;
      const nb = new Float32Array(Math.max(2, Math.round(w))); buf = nb; head = 0;
    }
    function step(n) {
      for (let i = 0; i < n; i++) {
        head = (head + 1) % buf.length;
        let y = queue.length ? queue.shift() : 0;
        if (!queue.length && state !== 'dead' && state !== 'unborn') y += (Math.random() - .5) * .35;
        buf[head] = y;
      }
    }
    function draw() {
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 0; x <= W; x += 16) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); }
      for (let y = 0; y <= H; y += 16) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); }
      ctx.stroke();
      const base = H * .56, n = buf.length, gap = 22;
      const seg = (from, to, alpha) => {
        ctx.beginPath(); let started = false;
        for (let k = from; k <= to; k++) { const i = (head - (n - 1 - k) + n * 2) % n, x = k * (W / (n - 1)), y = base + buf[i]; if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); }
        ctx.globalAlpha = alpha; ctx.stroke(); ctx.globalAlpha = 1;
      };
      // the trace scrolls: newest on the right, a dark gap where the sweep is, the oldest fading on the left
      ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineWidth = 1.8;
      ctx.shadowColor = col; ctx.shadowBlur = state === 'dead' || state === 'unborn' ? 0 : 8;
      const sx = n - 1 - gap; seg(0, Math.floor(sx * .35), .28); seg(Math.floor(sx * .35), Math.floor(sx * .7), .6); seg(Math.floor(sx * .7), sx, 1);
      ctx.shadowBlur = 0;
      const i = (head - gap + n) % n, hx = sx * (W / (n - 1)), hy = base + buf[i];
      ctx.fillStyle = state === 'dead' || state === 'unborn' ? col : '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, 7); ctx.fill();
    }
    let raf = 0;
    function loop(now) {
      const dt = Math.min(.1, (now - last) / 1000); last = now; size();
      if (!document.hidden) { step(Math.max(0, Math.round(dt * speed))); draw(); }
      raf = requestAnimationFrame(loop);
    }
    size(); draw();
    if (!calm) raf = requestAnimationFrame(loop);
    return {
      // one real trade: side 'buy' or 'sell', sol amount
      beat(side, sol) {
        const s = Math.max(.35, Math.min(1, .35 + Math.log10(1 + (Number(sol) || 0) * 10) / 2.2)), amp = (H || 80) * .40 * s * (side === 'sell' ? -1 : 1), len = 34;
        for (let k = 0; k < len; k++) queue.push(shape(k / (len - 1)) * amp);
        beats.push(Date.now()); while (beats.length && Date.now() - beats[0] > 60000) beats.shift();
        if (calm) { step(len); draw(); }
      },
      perMinute() { while (beats.length && Date.now() - beats[0] > 60000) beats.shift(); return beats.length; },
      set(s) { state = s; col = COL[s] || COL.alive; },
      stop() { cancelAnimationFrame(raf); },
    };
  }
  window.Ecg = Ecg;
})();
