// life fx: little glass coins drifting up behind the whole page, and the microscope leaning toward your cursor.
(function () {
  'use strict';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!calm && window.Dia) {
    const cv = document.createElement('canvas'); cv.className = 'plankton'; cv.setAttribute('aria-hidden', 'true'); document.body.prepend(cv);
    const ctx = cv.getContext('2d'); let W = 0, H = 0, dpr = 1;
    const N = innerWidth < 720 ? 12 : 28, STATES = ['alive', 'dead', 'alive', 'dead', 'asleep', 'dead', 'unborn', 'alive', 'dead', 'ascended'];
    const sprites = STATES.map((st, i) => { const c = document.createElement('canvas'); Dia.paint(c, 'plankton-' + i, st, { size: 56, fill: .42, bloom: false }); return c; });
    function size() { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    size(); addEventListener('resize', size);
    const spawn = any => { const z = Math.random(); return { x: Math.random() * W, y: any ? Math.random() * H : H + 40, z, s: 8 + z * 34, vy: .06 + z * .34, sw: Math.random() * 6.28, sa: .2 + Math.random() * .6, r: Math.random() * 6.28, vr: (Math.random() - .5) * .008, a: .08 + z * .34, img: sprites[Math.floor(Math.random() * sprites.length)] }; };
    const ps = Array.from({ length: N }, () => spawn(true));
    let last = performance.now(), sy = scrollY;
    (function frame(now) {
      const dt = Math.min(50, now - last) / 16.7; last = now;
      if (!document.hidden) {
        const ds = scrollY - sy; sy = scrollY;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
        for (let i = 0; i < ps.length; i++) {
          const p = ps[i]; p.y -= p.vy * dt + ds * p.z * .3; p.sw += .012 * dt; p.r += p.vr * dt;
          if (p.y < -60 || p.y > H + 70) { ps[i] = spawn(false); if (ds < 0) ps[i].y = -50; continue; }
          ctx.globalAlpha = p.a; ctx.save(); ctx.translate(p.x + Math.sin(p.sw) * 16 * p.sa, p.y); ctx.rotate(p.r); ctx.drawImage(p.img, -p.s / 2, -p.s / 2, p.s, p.s); ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      requestAnimationFrame(frame);
    })(last);
  }
  if (!calm && matchMedia('(pointer:fine)').matches) {
    let active = null;
    document.addEventListener('mousemove', e => {
      const host = e.target.closest && e.target.closest('.scope'), lens = host && host.querySelector('.lensw');
      if (active && active !== lens) { active.style.transform = ''; active = null; }
      if (!lens) return;
      const r = host.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      lens.style.transform = `perspective(1000px) rotateY(${(x * 12).toFixed(2)}deg) rotateX(${(-y * 12).toFixed(2)}deg)`; active = lens;
    }, { passive: true });
  }
})();
