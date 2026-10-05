// life, one coin: its life under the microscope with a live monitor, its words, asking it something, its family and
// everything that happened to it.
(function () {
  'use strict';
  const C = window.Core, $ = C.$, $$ = C.$$, esc = C.esc;
  const mint = (location.pathname.match(/\/c\/([1-9A-HJ-NP-Za-km-z]{32,44})/) || [])[1] || new URLSearchParams(location.search).get('mint');
  const S = { k: null, j: null, dia: null, ecg: null, last: 0, notes: [] };
  Dia.paint($('#markDia'), 'life', 'alive', { size: 22, fill: .42, bloom: false });
  const reticle = () => { let h = '<circle cx="50" cy="50" r="44.2" fill="none" stroke="rgba(255,255,255,.08)" stroke-width=".2"/>'; for (let a = 0; a < 360; a += 5) { const long = a % 30 === 0, r0 = long ? 44.6 : 45, r1 = long ? 47.2 : 46, t = a * Math.PI / 180; h += `<line x1="${50 + Math.cos(t) * r0}" y1="${50 + Math.sin(t) * r0}" x2="${50 + Math.cos(t) * r1}" y2="${50 + Math.sin(t) * r1}" stroke="rgba(255,255,255,${long ? .26 : .12})" stroke-width="${long ? .28 : .18}"/>`; } return h + '<line x1="50" y1="9.5" x2="50" y2="13" stroke="rgba(46,227,127,.6)" stroke-width=".3"/>'; };
  const ROLE = { launcher: 'launcher', god: 'godparent', house: 'the house' };

  function missing(text) {
    $('#kid').innerHTML = `<section class="missing"><div class="wrap"><canvas id="ghost" style="width:180px;height:180px;margin:0 auto"></canvas><h1>Nobody lives here.</h1><p class="note">${esc(text || 'No life lives at that address.')}</p><p><a class="btn" href="/#make">Give a coin a life</a></p></div></section>`;
    Dia.paint($('#ghost'), 'nobody-' + (mint || 'x'), 'dead', { size: 180, fill: .4 });
  }
  if (!mint) return missing('That isn’t a coin address.');

  function render() {
    const k = S.k, j = S.j, st = k.status === 'live' ? k.state : 'unborn', usd = k.mcap_sol != null && j.solUsd ? C.usd(k.mcap_sol * j.solUsd) : '—';
    document.title = k.name + ' · life';
    const shares = typeof k.shares === 'string' ? JSON.parse(k.shares) : k.shares, gods = k.gods || [], studio = j.studio;
    const fam = shares.map(s => ({ ...s, role: s.address === k.payer ? 'launcher' : s.address === studio ? 'house' : 'god', g: gods.find(g => g.wallet === s.address) }));
    $('#kid').innerHTML = `
    <section class="kh"><div class="wrap kg">
      <div class="scope">
        <div class="lensw"><div class="lens"><canvas id="kDia"></canvas></div><svg class="reticle" viewBox="0 0 100 100" aria-hidden="true">${reticle()}</svg>
          <div class="hud tl">specimen <b>${k.slot != null ? String(k.slot + 1).padStart(3, '0') : '—'}</b><br><b>$${esc(k.symbol)}</b></div>
          <div class="hud tr"><span class="pill st-${st}" id="kState"><i></i>${k.status === 'live' ? st : 'not live yet'}</span></div>
          <div class="hud bl">magnified <b>×400</b></div><div class="hud br" id="kWhen">${k.last_trade_at ? 'last trade ' + C.ago(new Date(k.last_trade_at)) : '—'}</div></div>
        <div class="monp"><div class="mh"><span>pulse · <b id="kBpm">0</b> trades / min</span><span id="kMon">connecting…</span></div><canvas id="kEcg"></canvas></div>
      </div>
      <div>
        <div class="kick"><i class="${st === 'alive' || st === 'ascended' ? '' : 'off'}"></i>coin · room · ${esc(st)}</div>
        <h1 class="kname">${esc(k.name)}</h1>
        <div class="ktk">$${esc(k.symbol)} · <span class="mono" id="kCa" style="cursor:pointer" title="copy">${C.short(k.mint, 6)}</span></div>
        <p class="kline">“${esc(k.line)}”</p>
        <dl class="kstats">
          <div><dt>mcap</dt><dd>${usd}</dd></div><div><dt>alive since</dt><dd>${k.born_at ? C.ago(new Date(k.born_at)).replace(' ago', '') : '—'}</dd></div><div><dt>notes</dt><dd>${k.notes}</dd></div>
          <div><dt>voice</dt><dd>${esc(k.style)}</dd></div><div><dt>to pay out</dt><dd>${C.sol(k.vault_lamports || 0)}</dd></div><div><dt>godparents</dt><dd>${gods.length}</dd></div>
        </dl>
        <div class="ctas"><a class="btn acc" href="https://pump.fun/coin/${k.mint}" target="_blank" rel="noopener">pump.fun ↗</a><a class="btn line" href="https://dexscreener.com/solana/${k.mint}" target="_blank" rel="noopener">chart ↗</a>${k.xhandle ? `<a class="btn line" href="https://x.com/${esc(k.xhandle)}" target="_blank" rel="noopener">X ↗</a>` : ''}<button class="btn line" id="kCopy" type="button">copy CA</button></div>
        ${k.status !== 'live' && C.S.me === k.payer ? '<p class="status" style="margin-top:16px"><button class="btn sm" id="kFinish" type="button">Finish the launch</button> its split isn’t locked yet.</p>' : ''}
      </div>
    </div></section>
    <section class="sec tint"><div class="wrap two-col">
      <div>
        <p class="eye"><b>01</b> its words</p>
        <h2 class="h2">What it <em>says.</em></h2>
        <div class="ask"><input class="in" id="ask" maxlength="240" placeholder="ask ${esc(k.name)} something"><button class="btn" id="askBtn" type="button">Ask</button></div>
        <div id="ans"></div>
        <div class="notes" id="kNotes"></div>
      </div>
      <div>
        <p class="eye"><b>02</b> its family</p>
        <h2 class="h2">Who it <em>pays.</em></h2>
        <p class="note" style="margin:-4px 0 16px">Its creator fees are split by pump.fun’s own fee sharing, locked at launch. Anyone can push what’s waiting out to all of them at once.</p>
        <div class="fam">${fam.map(f => `<div class="fm"><span class="role">${ROLE[f.role]}</span><a href="https://solscan.io/account/${f.address}" target="_blank" rel="noopener">${C.short(f.address, 5)}${f.g ? ` <span class="pill st-${f.g.alive ? 'alive' : 'dead'}" style="margin-left:6px"><i></i>${f.g.alive ? f.g.now : 'dead'}</span>` : ''}</a><span class="bps">${(f.bps / 100).toFixed(f.bps % 100 ? 2 : 0)}%</span></div>`).join('')}</div>
        <button class="btn" id="payBtn" type="button" style="width:100%;margin-top:12px" ${k.status === 'live' ? '' : 'disabled'}>Pay out ${C.sol(k.vault_lamports || 0)} to everyone</button>
        <p class="status" id="payStatus" role="status"></p>
        ${k.draw && k.draw.blockhash ? `<p class="note" style="margin-top:6px">Godparents drawn ${C.ago(new Date(k.draw.at))} from ${k.draw.pool} living ${k.draw.pool === 1 ? 'life' : 'lives'}, seeded by blockhash <span class="mono">${esc(String(k.draw.blockhash).slice(0, 10))}…</span></p>` : '<p class="note" style="margin-top:6px">No one was alive to draw when it launched, so its godparents’ share went to its launcher.</p>'}
        <p class="eye" style="margin-top:40px"><b>03</b> what happened</p>
        <div class="logl">${(j.log || []).map(l => `<div><span>${C.ago(new Date(l.at))}</span>${esc(l.text)}</div>`).join('') || '<div><span>—</span>Nothing yet.</div>'}</div>
      </div>
    </div></section>`;
    S.dia = Dia.live($('#kDia'), k.seed, st === 'unborn' ? 'unborn' : st, { fill: .40 });
    S.ecg = Ecg($('#kEcg'), { state: st });
    notes();
    $('#kCopy').onclick = () => C.copy(k.mint); $('#kCa').onclick = () => C.copy(k.mint);
    $('#askBtn').onclick = ask; $('#ask').addEventListener('keydown', e => { if (e.key === 'Enter') ask(); });
    $('#payBtn').onclick = pay;
    const fin = $('#kFinish'); if (fin) fin.onclick = async () => { try { await Cross.route(k.mint); C.toast('Its split is locked.'); load(); } catch (e) { C.toast(C.human(e)); } };
  }
  let playing = null;
  function play(btn, n) {
    if (playing) { playing.a && playing.a.pause(); try { speechSynthesis.cancel(); } catch {} playing.b.classList.remove('on'); if (playing.b === btn) { playing = null; return; } }
    btn.classList.add('on');
    if (n.audio) { const a = new Audio(n.audio); a.onended = () => { btn.classList.remove('on'); playing = null; }; a.play().catch(() => btn.classList.remove('on')); playing = { a, b: btn }; }
    else { C.speak(n.text, S.k.style); playing = { b: btn }; setTimeout(() => { if (playing && playing.b === btn) { btn.classList.remove('on'); playing = null; } }, Math.min(16000, 900 + n.text.length * 65)); }
  }
  function notes() {
    const ns = S.notes, el = $('#kNotes');
    el.innerHTML = ns.length ? ns.map((n, i) => `<div class="nt"><canvas></canvas><div><div class="tx">“${esc(n.text)}”</div><div class="who"><b>${n.kind === 'first' ? 'first words' : 'note'}</b> · ${C.ago(new Date(n.at))}</div></div><button class="play" type="button" data-i="${i}" aria-label="Hear it"><i></i></button></div>`).join('')
      : `<div class="nt" style="grid-template-columns:1fr"><div class="who">${S.k.status === 'live' ? 'Its first words are on their way. Notes come every six hours while it trades.' : 'It starts writing the moment it goes live.'}</div></div>`;
    $$('canvas', el).forEach(c => Dia.paint(c, S.k.seed, S.k.status === 'live' ? S.k.state : 'unborn', { size: c.clientWidth || 44, fill: .44, bloom: false }));
    $$('.play', el).forEach(b => b.addEventListener('click', () => play(b, ns[Number(b.dataset.i)])));
  }
  async function ask() {
    const q = $('#ask').value.trim(); if (q.length < 2) return;
    const btn = $('#askBtn'); btn.disabled = true; $('#ans').innerHTML = '<p class="note">It’s thinking…</p>';
    const r = await C.post('/api/talk', { mint, ask: q }).catch(() => null);
    btn.disabled = false;
    if (!r || !r.ok) { $('#ans').innerHTML = `<p class="status err">${esc((r && r.error) || 'No answer this time. Try again.')}</p>`; return; }
    $('#ans').innerHTML = `<div class="ans">“${esc(r.text)}”</div>`; $('#ask').value = '';
    if (r.audio) new Audio(r.audio).play().catch(() => {}); else C.speak(r.text, r.style || S.k.style);
  }
  async function pay() {
    const s = $('#payStatus'), btn = $('#payBtn'); btn.disabled = true; s.className = 'status'; s.textContent = 'Building the payout…';
    try { const r = await Cross.feed(mint); if (r) { s.className = 'status ok'; s.textContent = 'Paid out to everyone in its split.'; setTimeout(load, 3000); } else { s.textContent = ''; } }
    catch (e) { s.className = 'status err'; s.textContent = C.human(e); }
    finally { btn.disabled = false; }
  }
  async function load() {
    const j = await C.get('/api/kid?mint=' + mint).catch(() => null);
    if (!j || !j.ok) { if (!S.k) missing(j && j.error); return; }
    const fresh = !S.k || S.k.state !== j.coin.state || S.k.status !== j.coin.status || S.k.notes !== j.coin.notes || S.k.vault_lamports !== j.coin.vault_lamports;
    S.j = j; S.notes = j.notes || [];
    if (fresh) { if (S.dia) S.dia.stop(); if (S.ecg) S.ecg.stop(); S.k = j.coin; render(); } else S.k = j.coin;
  }
  Live.births(false);
  Live.on('status', up => { const m = $('#kMon'); if (m) m.textContent = up ? 'live from pump.fun' : 'feed offline'; });
  Live.on('trade', t => {
    if (t.mint !== mint || !S.ecg) return;
    S.ecg.beat(t.side, t.sol); S.dia.beat(t.side === 'buy' ? .9 : .5); S.last = Date.now();
    if (S.k && S.k.status === 'live' && S.k.state !== 'alive' && S.k.state !== 'ascended') { S.dia.set('alive'); S.ecg.set('alive'); const p = $('#kState'); if (p) { p.className = 'pill st-alive'; p.innerHTML = '<i></i>alive'; } }
  });
  setInterval(() => { const b = $('#kBpm'); if (b && S.ecg) b.textContent = S.ecg.perMinute(); const w = $('#kWhen'); if (w && S.last) w.textContent = 'last trade ' + C.ago(S.last); }, 1000);
  C.onWallet(() => { if (S.k) render(); });
  load().then(() => { Live.start(); Live.watch([mint]); });
  setInterval(() => { if (!document.hidden) load(); }, 60000);
})();
