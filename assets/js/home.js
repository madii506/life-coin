// life, page one: the first life under the microscope, pump.fun's births on the tape, the studio, the dish, being born.
(function () {
  'use strict';
  const C = window.Core, $ = C.$, $$ = C.$$, esc = C.esc;
  const RANK = { alive: 0, ascended: 1, asleep: 2, dead: 3 };
  const ST = { board: null, sort: 'alive', style: 'calm', seed: Dia.newSeed(), cells: new Map(), lifeMint: null, lastLifeTrade: 0, me: null };
  const TOK = ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'], CB = 'ComputeBudget111111111111111111111111111111';
  const fmtInt = n => Number(n).toLocaleString('en-US');
  const usdOf = (k, j) => (k.mcap_sol != null && j && j.solUsd ? C.usd(k.mcap_sol * j.solUsd) : '—');

  // ---------- the mark, the dot on the i, the first life ----------
  Dia.paint($('#markDia'), 'life', 'alive', { size: 22, fill: .42, bloom: false });
  let tit = null;
  const startTittle = () => { if (!tit) tit = Dia.live($('#tittle'), 'life', 'alive', { fill: .42 }); };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(startTittle); setTimeout(startTittle, 1500);
  const hero = Dia.live($('#heroDia'), 'life', 'unborn', { fill: .40 });
  const ecg = Ecg($('#heroEcg'), { state: 'unborn' });
  (function reticle() {
    const s = $('#reticle'); let h = '<circle cx="50" cy="50" r="44.2" fill="none" stroke="rgba(255,255,255,.08)" stroke-width=".2"/>';
    for (let a = 0; a < 360; a += 5) { const long = a % 30 === 0, r0 = long ? 44.6 : 45, r1 = long ? 47.2 : 46, t = a * Math.PI / 180; h += `<line x1="${50 + Math.cos(t) * r0}" y1="${50 + Math.sin(t) * r0}" x2="${50 + Math.cos(t) * r1}" y2="${50 + Math.sin(t) * r1}" stroke="rgba(255,255,255,${long ? .26 : .12})" stroke-width="${long ? .28 : .18}"/>`; }
    h += '<line x1="50" y1="9.5" x2="50" y2="13" stroke="rgba(46,227,127,.6)" stroke-width=".3"/>';
    s.innerHTML = h;
  })();
  function heroState(s) {
    hero.set(s); ecg.set(s); const p = $('#heroState'); p.className = 'pill st-' + s; p.innerHTML = '<i></i>' + s;
  }
  setInterval(() => {
    $('#heroBpm').textContent = ecg.perMinute();
    if (ST.lifeMint) { const quiet = Date.now() - ST.lastLifeTrade > 6 * 60e3; if (ST.lastLifeTrade && quiet) heroState('asleep'); $('#heroWhen').textContent = ST.lastLifeTrade ? 'last trade ' + C.ago(ST.lastLifeTrade) : 'waiting for a trade'; }
  }, 1000);

  // ---------- live: pump.fun's births on the tape, real trades on the monitors ----------
  const tape = $('#tapeT'); let off = 0, births = 0, tapeOn = false;
  function tapeItem(b) {
    const el = document.createElement('span'); el.innerHTML = `<i></i><b>${esc(b.name || 'unnamed')}</b> $${esc(b.symbol || '?')}`;
    if (!tapeOn) { tape.innerHTML = ''; tapeOn = true; }
    tape.appendChild(el); while (tape.children.length > 40) tape.removeChild(tape.firstChild);
  }
  (function roll() {
    if (!C.calm && tapeOn && !document.hidden) {
      off -= .6; const f = tape.firstElementChild;
      if (f && -off > f.offsetWidth + 26) { off += f.offsetWidth + 26; tape.appendChild(f); }
      tape.style.transform = `translateX(${off}px)`;
    }
    requestAnimationFrame(roll);
  })();
  Live.on('status', up => { $('#tapeDot').classList.toggle('on', up); if (!up && !births) { tape.innerHTML = '<span>pump.fun’s live feed is offline right now</span>'; tapeOn = false; } $('#heroMon').textContent = up ? (ST.lifeMint ? 'live from pump.fun' : 'flatline · no coin yet') : 'feed offline'; });
  Live.on('birth', b => { births++; $('#tapeN').textContent = fmtInt(births); tapeItem(b); });
  Live.on('trade', t => {
    if (ST.lifeMint && t.mint === ST.lifeMint) { ST.lastLifeTrade = Date.now(); heroState('alive'); ecg.beat(t.side, t.sol); hero.beat(t.side === 'buy' ? .9 : .5); }
    const cell = ST.cells.get(t.mint);
    if (cell) { cell.classList.remove('beat', 'sell'); void cell.offsetWidth; cell.classList.add('beat'); if (t.side === 'sell') cell.classList.add('sell'); }
  });
  Live.start();

  // ---------- the studio ----------
  const pv = Dia.live($('#pvDia'), ST.seed, 'unborn', { fill: .40 });
  Ecg($('#pvEcg'), { state: 'unborn' });
  $('#pvGods').innerHTML = '<i></i>'.repeat(8);
  const showSeed = () => { $('#seed').textContent = ST.seed; };
  showSeed();
  $('#reroll').addEventListener('click', () => { ST.seed = Dia.newSeed(); showSeed(); pv.seed(ST.seed); });
  $$('#styles .chip').forEach(b => b.addEventListener('click', () => { ST.style = b.dataset.s; $$('#styles .chip').forEach(x => x.classList.toggle('on', x === b)); C.speak(sample(), ST.style); }));
  const sample = () => { const l = $('#line').value.trim(), n = $('#nm').value.trim() || 'your coin'; return l ? `Hi, I’m ${n}. ${l}.` : `Hi. I live inside ${n}. Somebody has to.`; };
  $('#pvHear').addEventListener('click', () => C.speak(sample(), ST.style));
  function syncPv() {
    const l = $('#line').value.trim(), n = $('#nm').value.trim(), t = $('#tk').value.trim().replace(/^\$/, '').toUpperCase();
    $('#pvName').textContent = n ? n + (t ? '  $' + t : '') : 'your coin';
    const q = $('#pvLine'); q.textContent = l ? '“' + l + '”' : '“who lives in here?”'; q.classList.toggle('ph', !l);
  }
  ['line', 'nm', 'tk'].forEach(id => $('#' + id).addEventListener('input', syncPv));
  $('#tk').addEventListener('input', e => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v !== e.target.value) e.target.value = v; });
  const buy = Cross.buyBox($('#buyBox'));
  function splitBox(gods) {
    const j = ST.board || {}, pool = (j.lives && j.lives.alive) || 0, n = gods ? gods.length : Math.min(8, pool), has = n > 0;
    const you = has ? 70 : 85;
    $('#split').innerHTML = `<div class="bars"><i style="width:${you}%"></i><i style="width:${has ? 15 : 0}%"></i><i style="width:15%"></i></div>
      <dl><div><dt>you</dt><dd>${you}%</dd></div><div><dt>godparents</dt><dd>${has ? 15 : 0}%<small>${has ? (gods ? n + ' drawn' : 'up to 8') : 'none yet'}</small></dd><div class="gods">${Array.from({ length: 8 }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('')}</div></div><div><dt>the house</dt><dd>15%</dd></div></dl>
      <p>${gods ? (gods.length ? 'Drawn just now: ' + gods.map(g => `<b class="mono">${C.short(g.wallet)}</b> (${g.stage})`).join(', ') + '.' : 'No one was alive to draw, so their 15% is yours.')
        : has ? `${fmtInt(pool)} ${pool === 1 ? 'life is' : 'lives are'} alive to draw from. Godparents are drawn the moment you launch, older lives with more tickets.` : 'No one has been born yet, so the godparents’ 15% stays with you. The house’s 15% pays for every life’s words and voice.'}</p>`;
  }
  function goLabel() {
    const b = $('#goBtn'), j = ST.board;
    if (j && !j.open) { b.disabled = true; b.textContent = 'Launching opens soon'; return; }
    b.disabled = false; b.textContent = C.S.me ? 'Give it a life on pump.fun' : 'Connect wallet to launch';
  }
  const status = (t, cls) => { const s = $('#goStatus'); s.className = 'status' + (cls ? ' ' + cls : ''); s.innerHTML = t || ''; };
  $('#goBtn').addEventListener('click', async () => {
    if (!C.S.me) { await C.connect(); return; }
    const line = $('#line').value.trim(), name = $('#nm').value.trim(), symbol = $('#tk').value.trim().toUpperCase();
    if (line.length < 8) return status('Write who lives inside first: one line.', 'err');
    if (!name) return status('Give it a name.', 'err');
    if (!/^[A-Z0-9]{1,10}$/.test(symbol)) return status('The ticker is 1–10 letters or numbers.', 'err');
    if (buy.over()) return status('Up to 5 SOL in the first buy.', 'err');
    const btn = $('#goBtn'), prog = $('#goProg'); btn.disabled = true; status(''); $('#goRes').hidden = true;
    try {
      const r = await Cross.run({ name, symbol, line, style: ST.style, seed: ST.seed, x: $('#xh').value.trim(), devBuy: buy.lamports(),
        onStep: i => Cross.steps(prog, i), onDraw: m => splitBox(m.gods) });
      Cross.steps(prog, Cross.STEPS.length, true);
      const res = $('#goRes'); res.hidden = false;
      res.innerHTML = `<div class="res"><b>${esc(name)} has a life.</b> It’s live on pump.fun with its split locked.${r.buyNote ? ' ' + esc(r.buyNote) : ''}<br><a href="/c/${r.mint}">Watch it live →</a> · <a href="https://pump.fun/coin/${r.mint}" target="_blank" rel="noopener">pump.fun ↗</a></div>`;
      status('Done.', 'ok'); ST.seed = Dia.newSeed(); showSeed(); pv.seed(ST.seed); load();
    } catch (e) {
      status(esc(C.human(e)) + (e.mint ? ` <a href="/c/${e.mint}">Open its page</a>` : ''), 'err');
    } finally { btn.disabled = false; goLabel(); }
  });

  // ---------- the dish ----------
  const painter = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const c = e.target; Dia.paint(c, c.dataset.seed, c.dataset.st, { size: c.clientWidth || 132, fill: .4 }); painter.unobserve(c); } }), { rootMargin: '200px' }) : null;
  const paintLater = c => (painter ? painter.observe(c) : Dia.paint(c, c.dataset.seed, c.dataset.st, { size: c.clientWidth || 132, fill: .4 }));
  function dish() {
    const j = ST.board, el = $('#dishGrid'); ST.cells.clear();
    if (!j || !j.coins || !j.coins.length) {
      el.innerHTML = `<div class="empty"><canvas id="emptyDia"></canvas><div><h3>No lives yet.</h3><p>${j && j.offline ? 'life’s records are offline right now.' : 'The first coin on the dish could be yours. Until then, it’s an empty shell.'}</p><a class="btn sm" href="#make">Give a coin a life</a></div></div>`;
      Dia.paint($('#emptyDia'), 'empty-dish', 'dead', { size: 120, fill: .42 }); return;
    }
    const lastBy = new Map(); (j.notes || []).forEach(n => { if (!lastBy.has(n.mint)) lastBy.set(n.mint, n.text); });
    const ks = j.coins.slice().sort((a, b) => ST.sort === 'new' ? b.slot - a.slot : ST.sort === 'big' ? (b.mcap_sol || 0) - (a.mcap_sol || 0)
      : (RANK[a.state] - RANK[b.state]) || (new Date(b.last_trade_at || 0) - new Date(a.last_trade_at || 0)));
    el.innerHTML = `<div class="dish">${ks.map(k => `<a class="cell" href="/c/${k.mint}" data-m="${k.mint}"><canvas data-seed="${esc(k.seed)}" data-st="${k.state}"></canvas>
      <div class="nm">${esc(k.name)}</div><div class="tk"><span>$${esc(k.symbol)}</span><span class="pill st-${k.state}"><i></i>${k.state}</span></div>
      <div class="ln">${esc(lastBy.get(k.mint) || k.line || '')}</div>
      <div class="ft"><span>mcap <b>${usdOf(k, j)}</b></span><span>${k.born_at ? C.ago(new Date(k.born_at)) : '—'}</span></div></a>`).join('')}</div>`;
    $$('.cell', el).forEach(c => { ST.cells.set(c.dataset.m, c); paintLater(c.querySelector('canvas')); });
    Live.watch(ks.filter(k => k.state !== 'ascended').map(k => k.mint));
  }
  $$('#sorts button').forEach(b => b.addEventListener('click', () => { ST.sort = b.dataset.s; $$('#sorts button').forEach(x => x.classList.toggle('on', x === b)); dish(); }));
  let playing = null;
  function play(btn, n) {
    if (playing) { playing.a && playing.a.pause(); try { speechSynthesis.cancel(); } catch {} playing.b.classList.remove('on'); if (playing.b === btn) { playing = null; return; } }
    btn.classList.add('on');
    if (n.audio) { const a = new Audio(n.audio); a.onended = () => { btn.classList.remove('on'); playing = null; }; a.play().catch(() => { btn.classList.remove('on'); }); playing = { a, b: btn }; }
    else { C.speak(n.text, n.style); playing = { b: btn }; setTimeout(() => { if (playing && playing.b === btn) { btn.classList.remove('on'); playing = null; } }, Math.min(16000, 900 + n.text.length * 65)); }
  }
  function over() {
    const ns = (ST.board && ST.board.notes) || []; $('#over').hidden = !ns.length; if (!ns.length) return;
    $('#overList').innerHTML = ns.slice(0, 8).map((n, i) => `<div class="nt"><canvas data-seed="${esc(n.seed)}" data-st="${n.state}"></canvas><a href="/c/${n.mint}" style="text-decoration:none"><div class="tx">“${esc(n.text)}”</div><div class="who"><b>${esc(n.name)}</b> $${esc(n.symbol)} · ${C.ago(new Date(n.at))}</div></a><button class="play" type="button" data-i="${i}" aria-label="Hear it"><i></i></button></div>`).join('');
    $$('#overList canvas').forEach(c => Dia.paint(c, c.dataset.seed, c.dataset.st, { size: c.clientWidth || 44, fill: .44, bloom: false }));
    $$('#overList .play').forEach(b => b.addEventListener('click', () => play(b, ns[Number(b.dataset.i)])));
  }

  // ---------- be born ----------
  (function ladder() {
    const R = [['newborn', '1x', 'day 0', 54], ['kid', '1.5x', 'day 3', 72], ['adult', '2x', 'day 10', 90], ['elder', '3x', 'day 30', 110]];
    $('#ladder').innerHTML = R.map(r => `<div class="rung"><div class="cvw"><canvas data-s="${r[0]}" style="width:${r[3]}px;height:${r[3]}px"></canvas></div><b>${r[0]}</b><span class="x">${r[1]}</span><small>from ${r[2]}</small></div>`).join('');
    $$('#ladder canvas').forEach(c => Dia.paint(c, 'stage-' + c.dataset.s, c.dataset.s === 'elder' ? 'ascended' : 'alive', { size: parseInt(c.style.width, 10), fill: .42 }));
    C.reveal($('#born'));
  })();
  $$('#howGrid canvas').forEach(c => Dia.paint(c, c.dataset.dia, c.dataset.st, { size: 64, fill: .42 }));
  function meHead(st, label) { return `<div class="ch st-${st}"><span class="dot"></span><b>your life</b><span class="pill st-${st}"><i></i>${label || st}</span><span class="crumb">${C.S.me ? C.short(C.S.me) : 'not connected'}</span></div>`; }
  function burnForm(label, min, bal) {
    return `<div class="burn"><input class="in" id="burnAmt" inputmode="numeric" value="${min}" aria-label="$LIFE to burn"><button class="btn acc" id="burnBtn" type="button">${label}</button></div>
      <p class="note" style="margin:10px 0 0">You hold <b class="mono">${bal == null ? '—' : fmtInt(bal)}</b> $LIFE. A birth burns at least ${fmtInt(min)}.</p><p class="status" id="burnStatus" role="status"></p>`;
  }
  async function me() {
    const el = $('#me'), j = ST.board || {};
    if (!C.S.me) {
      el.innerHTML = meHead('unborn', 'not born') + `<div class="body"><div class="big">Not born <em>yet.</em></div><p class="note">Connect the wallet that holds your $LIFE to see your life, be born, and find the coins you’re godparent to.</p><button class="btn acc" id="meConnect" type="button" style="width:100%;margin-top:8px">Connect wallet</button></div>`;
      $('#meConnect').onclick = () => C.connect(); return;
    }
    if (!j.life) {
      el.innerHTML = meHead('unborn', 'waiting') + `<div class="body"><div class="big">Births open when <em>$LIFE</em> launches.</div><p class="note">Once it’s live, you’ll burn $LIFE here to be born. Nothing to do yet.</p>${burnForm('Be born', j.minBurn || 10000, null)}</div>`;
      $('#burnBtn').disabled = true; $('#burnAmt').disabled = true; return;
    }
    el.innerHTML = meHead('unborn', 'reading') + '<div class="body"><p class="note">Reading your life…</p></div>';
    const r = await C.get('/api/born?w=' + C.S.me).catch(() => null);
    if (!r || !r.ok) { el.innerHTML = meHead('unborn', 'offline') + `<div class="body"><p class="note">${esc((r && r.error) || 'Your life didn’t load. Try again in a moment.')}</p></div>`; return; }
    const l = r.life, min = r.minBurn || 10000;
    if (!l) { el.innerHTML = meHead('unborn', 'not born') + `<div class="body"><div class="big">Not born <em>yet.</em></div>${burnForm('Burn and be born', min, r.balance)}</div>`; }
    else if (l.state === 'dead') {
      el.innerHTML = meHead('dead', 'dead') + `<div class="body"><div class="big">Your life <em>ended.</em></div><p class="note">It died ${l.died_at ? C.ago(new Date(l.died_at)) : ''}${l.cause === 'sold' ? ': this wallet sold below what it held at birth.' : '.'} Coins it was godparent to still pay it.</p>${kids(l)}${burnForm('Be born again', min, r.balance)}</div>`;
    } else {
      const days = Math.floor(l.days || 0);
      el.innerHTML = meHead('alive', l.stage) + `<div class="body"><div class="big">You’re ${/^[ae]/.test(l.stage) ? 'an' : 'a'} <em>${l.stage}.</em></div>
        <dl><div><dt>age</dt><dd>${days} day${days === 1 ? '' : 's'}</dd></div><div><dt>tickets</dt><dd>${l.mult}x</dd></div>
        <div><dt>next</dt><dd>${l.next ? l.next.stage + ' in ' + Math.ceil(l.next.in) + 'd' : 'oldest stage'}</dd></div><div><dt>lives lived</dt><dd>${l.lives}</dd></div></dl>
        ${kids(l)}<p class="note" style="margin:16px 0 0">Feed it more $LIFE if you like. It won’t make it older.</p>${burnForm('Feed it', min, r.balance)}</div>`;
    }
    const b = $('#burnBtn'); if (b) b.onclick = () => burn(r);
    $$('#me .kids canvas').forEach(c => Dia.paint(c, c.dataset.seed, c.dataset.st, { size: 28, fill: .44, bloom: false }));
  }
  function kids(l) {
    const k = l.godchildren || [];
    if (!k.length) return '<p class="note">No godchildren yet. You’re in the draw for every new coin.</p>';
    return `<p class="note" style="margin:6px 0 0">Godparent to ${k.length} coin${k.length === 1 ? '' : 's'}:</p><div class="kids">${k.slice(0, 12).map(c => `<a href="/c/${c.mint}"><canvas data-seed="${esc(c.seed)}" data-st="${c.state}"></canvas><span><b>${esc(c.name)}</b> $${esc(c.symbol)}</span><span>${C.sol(c.vault_lamports || 0)} waiting</span></a>`).join('')}</div>`;
  }
  async function burn(info) {
    const st = (t, c) => { const s = $('#burnStatus'); if (s) { s.className = 'status' + (c ? ' ' + c : ''); s.textContent = t; } };
    const amt = Math.floor(Number(String($('#burnAmt').value).replace(/[, _]/g, '')));
    if (!(amt >= (info.minBurn || 10000))) return st(`A birth burns at least ${fmtInt(info.minBurn || 10000)} $LIFE.`, 'err');
    const btn = $('#burnBtn'); btn.disabled = true;
    try {
      st('Building the burn…');
      const r = await C.post('/api/born', { wallet: C.S.me, amount: amt }); if (!r.ok) throw new Error(r.error);
      const w3 = await C.loadWeb3(), tx = w3.VersionedTransaction.deserialize(Uint8Array.from(atob(r.tx), c => c.charCodeAt(0)));
      // read it before signing: only compute-budget and one burn of $LIFE from your own account, for exactly that amount
      const m = tx.message, keys = m.staticAccountKeys.map(k => k.toBase58()); let ok = false;
      for (const ix of m.compiledInstructions) {
        const prog = keys[ix.programIdIndex], d = ix.data;
        if (prog === CB) continue;
        if (!TOK.includes(prog) || d[0] !== 15 || ok) throw new Error('The burn isn’t what was shown, so nothing was signed.');
        let v = 0n; for (let i = 8; i >= 1; i--) v = v * 256n + BigInt(d[i]);
        const ks = ix.accountKeyIndexes.map(i => keys[i]);
        if (v !== BigInt(r.amount) || ks[1] !== r.mint || ks[2] !== C.S.me) throw new Error('The burn isn’t what was shown, so nothing was signed.');
        ok = true;
      }
      if (!ok) throw new Error('The burn is missing, so nothing was signed.');
      st('Waiting for your wallet…');
      const [signed] = await C.signAll([tx]); const sig = await C.send(signed); st('Burning…'); await C.confirm(sig);
      st('Reading it from Solana…');
      let v = null; for (let i = 0; i < 6; i++) { v = await C.post('/api/born', { wallet: C.S.me, sig }).catch(() => null); if (v && v.ok) break; await new Promise(z => setTimeout(z, 2000)); }
      if (!v || !v.ok) throw new Error((v && v.error) || 'The burn landed; your birth will show after the next check.');
      C.toast('You were born.'); load();
    } catch (e) { st(C.human(e), 'err'); btn.disabled = false; }
  }
  function elders() {
    const e = (ST.board && ST.board.elders) || [], el = $('#elders');
    el.innerHTML = `<p class="eye"><b>·</b> the oldest lives</p>` + (e.length ? `<table class="tbl"><thead><tr><th>#</th><th>wallet</th><th>stage</th><th>age</th><th>godchildren</th></tr></thead><tbody>${e.map((x, i) => `<tr><td>${i + 1}</td><td><b>${C.short(x.wallet)}</b></td><td><span class="pill st-${x.stage === 'elder' ? 'ascended' : 'alive'}"><i></i>${x.stage}</span></td><td>${Math.floor(x.days)}d</td><td>${x.kids}</td></tr>`).join('')}</tbody></table>`
      : `<p class="note">${ST.board && ST.board.life ? 'No one has been born yet. The first life will be the oldest for a while.' : 'No one can be born until $LIFE launches.'}</p>`);
  }

  // ---------- load ----------
  function lifeCoin() {
    const m = ST.lifeMint;
    $('#kickDot').classList.toggle('off', !m); $('#kickTxt').textContent = m ? '$LIFE · live on solana' : '$LIFE · launching soon';
    if (m) {
      $('#heroName').textContent = '$LIFE'; if (!ST.lastLifeTrade) { heroState('asleep'); $('#heroWhen').textContent = 'waiting for a trade'; }
      const ca = $('#caRow'); ca.hidden = false;
      ca.innerHTML = `<span class="addr">${C.short(m, 6)}<button type="button" id="caCopy">copy</button></span><a href="https://pump.fun/coin/${m}" target="_blank" rel="noopener">pump.fun ↗</a><a href="https://dexscreener.com/solana/${m}" target="_blank" rel="noopener">chart ↗</a>`;
      $('#caCopy').onclick = () => C.copy(m); Live.watch([m]);
    } else { heroState('unborn'); $('#heroWhen').textContent = 'no coin yet'; }
  }
  async function load() {
    const j = await C.get('/api/board').catch(() => null);
    ST.board = j && (j.ok || j.offline) ? j : { coins: [], notes: [], elders: [], lives: { alive: 0 }, open: false, offline: true };
    if (ST.board.life && ST.board.life !== ST.lifeMint) { ST.lifeMint = ST.board.life; } lifeCoin();
    $('#minBurn').textContent = fmtInt(ST.board.minBurn || 10000);
    splitBox(); goLabel(); dish(); over(); elders(); me();
  }
  C.onWallet(() => { goLabel(); me(); });
  syncPv(); load();
  setInterval(() => { if (!document.hidden) C.get('/api/board').then(j => { if (j && j.ok) { ST.board = j; dish(); over(); elders(); } }).catch(() => {}); }, 60000);
})();
