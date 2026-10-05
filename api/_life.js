// life: every coin launched here gets a small life living inside it, and $LIFE holders can be born, grow up and become
// godparents. This file: reading coins from the chain, the godparent draw, holders' births and deaths, and what each
// life says (a small OpenAI model writes it; ElevenLabs speaks it when the house's key is set).
const crypto = require('crypto');
const L = require('./_lib');
const DAY = L.DAY, HOUR = 36e5;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const short = a => String(a).slice(0, 4) + '…' + String(a).slice(-4);
const BREAK = 'It’s resting: the house’s AI credits are being topped up. Try again soon.';
const broke = e => /credit|quota|payment|insufficient|top-?up|limit/i.test(String(e || ''));
// ElevenLabs' own premade voices, one per voice style picked at launch
const VOICES = { calm: 'EXAVITQu4vr4xnSDxMaL', deep: 'JBFqnCBsd6RMkjVDRZzb', bright: 'FGY2WhTYpPnrIDTdsKH5', fast: 'TX3LPaxmHKxFdv7VOQHJ' };

// ---------- the chain ----------
async function routingOf(mint) {
  if (L.MOCK && L.MOCK.routing) return L.MOCK.routing(mint);
  return require('./_pump').routing(mint, L.accounts);
}
const sameShares = (got, want) => got.length === want.length && want.every((w, i) => got[i].address === w.address && got[i].bps === w.bps);
const parse = v => (typeof v === 'string' ? JSON.parse(v) : v);
async function settle(mint) {
  const k = (await L.q('SELECT mint, symbol, name, status, slot, shares FROM lfe_coins WHERE mint=$1', [mint]))[0];
  if (!k) return { ok: false, error: 'No coin was recorded for that token.' };
  if (k.status === 'live') return { ok: true, live: true, slot: k.slot };
  if (k.status === 'void') return { ok: true, live: false, void: true };
  const r = await routingOf(mint);
  if (!r.exists) return { ok: true, live: false, waiting: 'coin' };
  if (!(r.routed && r.revoked && sameShares(r.shareholders, parse(k.shares)))) return { ok: true, live: false, waiting: 'split', mint };
  for (let i = 0; i < 4; i++) {
    try {
      const u = await L.q(`UPDATE lfe_coins SET status='live', slot=(SELECT coalesce(max(slot),-1)+1 FROM lfe_coins WHERE status='live'), born_at=now(), state=$4,
        last_trade_at=now(), mcap_sol=$2, mcap_note=$2, complete=$3 WHERE mint=$1 AND status<>'live' RETURNING slot`, [mint, r.mcapSol, !!r.complete, r.complete ? 'ascended' : 'alive']);
      if (u.length) await L.log('born', mint, `${k.name} ($${k.symbol}) got a life`);
      const s = (await L.q('SELECT slot FROM lfe_coins WHERE mint=$1', [mint]))[0];
      return { ok: true, live: true, slot: s && s.slot, fresh: u.length > 0 };
    } catch (e) { if (!/unique|duplicate/i.test(String(e && e.message))) throw e; }
  }
  return { ok: true, live: false, waiting: 'slot' };
}
async function lastTrade(mint) {
  if (L.MOCK && L.MOCK.lastTrade) return L.MOCK.lastTrade(mint);
  const r = await L.rpc('getSignaturesForAddress', [L.bondingCurveOf(mint), { limit: 1, commitment: 'confirmed' }]).catch(() => null);
  return r && r[0] && r[0].blockTime ? new Date(r[0].blockTime * 1000) : null;
}
// alive while it trades; asleep after six quiet hours; dead after a quiet week; ascended once its curve completes
const stateFor = (k, now) => k.complete ? 'ascended' : !k.last_trade_at ? 'alive' : now - new Date(k.last_trade_at) >= 7 * DAY ? 'dead' : now - new Date(k.last_trade_at) >= 6 * HOUR ? 'asleep' : 'alive';
const SAYS = { alive: 'woke up: someone traded', asleep: 'fell asleep: six hours without a trade', dead: 'died: a week without a trade', ascended: 'ascended: its curve is complete' };
async function readBoard() {
  const ks = await L.q(`SELECT mint, symbol, name, state, mcap_sol, complete, last_trade_at FROM lfe_coins WHERE status='live' ORDER BY slot`);
  const vaults = ks.length ? await L.accounts(ks.map(k => L.vaultOf(k.mint))).catch(() => ks.map(() => null)) : [];
  const curves = ks.length ? await L.accounts(ks.map(k => L.bondingCurveOf(k.mint))).catch(() => ks.map(() => null)) : [];
  const now = Date.now(); let changes = 0;
  await L.pool(ks, 6, async (k, i) => {
    let mcap = k.mcap_sol, complete = k.complete;
    if (L.MOCK && L.MOCK.routing) { const r = await L.MOCK.routing(k.mint); mcap = r.mcapSol; complete = !!r.complete; }
    else if (curves[i]) { try { const { PUMP_SDK } = require('@pump-fun/pump-sdk'); const bc = PUMP_SDK.decodeBondingCurve(curves[i]); const vq = bc.virtualSolReserves || bc.virtualQuoteReserves, vt = bc.virtualTokenReserves; complete = !!bc.complete; if (vt && !vt.isZero()) mcap = Number(vq.mul(bc.tokenTotalSupply).div(vt).toString()) / 1e9; } catch {} }
    const vl = vaults[i] ? Math.max(0, vaults[i].lamports - L.RENT0) : 0;
    const t = complete ? null : await lastTrade(k.mint);
    const last = t && (!k.last_trade_at || t > new Date(k.last_trade_at)) ? t : k.last_trade_at;
    const st = stateFor({ ...k, complete, last_trade_at: last }, now);
    if (st !== k.state) { changes++; await L.log(st, k.mint, `${k.name} ${SAYS[st]}`); }
    await L.q(`UPDATE lfe_coins SET mcap_sol=$2, complete=$3, last_trade_at=$4, state=$5, vault_lamports=$6 WHERE mint=$1`, [k.mint, mcap, complete, last, st, vl]);
  });
  return { coins: ks.length, changes };
}

// ---------- godparents: drawn from living $LIFE holders the moment a coin is recorded, weighted by how long each has
// lived (newborn 1x, kid 1.5x, adult 2x, elder 3x). The draw is seeded by Solana's latest finalized blockhash. ----------
function prng(seedHex) { let ctr = 0; return () => crypto.createHash('sha256').update(seedHex + ':' + (ctr++)).digest().readUInt32BE(0) / 4294967296; }
async function drawGods(mint, payer) {
  const lives = await L.q(`SELECT wallet, born_at FROM lfe_lives WHERE state='alive' ORDER BY born_at LIMIT 5000`);
  const pool = lives.filter(l => l.wallet !== payer && l.wallet !== L.STUDIO);
  let bh = null; try { bh = (await L.rpc('getLatestBlockhash', [{ commitment: 'finalized' }])).value.blockhash; } catch {}
  const draw = { blockhash: bh, pool: pool.length, at: new Date().toISOString() };
  if (!pool.length) return { gods: [], draw };
  if (!bh) throw new Error('Solana didn’t answer, so the godparents couldn’t be drawn. Try again in a moment.');
  const rnd = prng(crypto.createHash('sha256').update(bh + ':' + mint).digest('hex'));
  const keyed = pool.map(l => { const s = L.stageOf(l.born_at); return { wallet: l.wallet, stage: s.stage, mult: s.mult, key: Math.log(Math.max(1e-12, rnd())) / s.mult }; });
  keyed.sort((a, b) => b.key - a.key);
  return { gods: keyed.slice(0, L.MAX_GODS).map(({ wallet, stage, mult }) => ({ wallet, stage, mult })), draw };
}

// ---------- holders' lives ----------
async function lifeOf(wallet) {
  const l = (await L.q('SELECT wallet, born_at, burned, held, state, died_at, cause, lives FROM lfe_lives WHERE wallet=$1', [wallet]))[0];
  if (!l) return null;
  const kids = await L.q(`SELECT mint, name, symbol, seed, state, mcap_sol, vault_lamports, born_at FROM lfe_coins WHERE status='live' AND gods @> $1::jsonb ORDER BY born_at DESC LIMIT 100`,
    [JSON.stringify([{ wallet }])]);
  return { ...l, burned: String(l.burned), held: String(l.held), ...(l.state === 'alive' ? L.stageOf(l.born_at) : {}), godchildren: kids };
}
async function buildBurn(wallet, whole) {
  const t = await L.lifeToken(); if (!t) throw new Error('Births open when $LIFE launches.');
  const n = Math.floor(Number(whole));
  if (!(n >= L.MIN_BURN)) throw new Error(`A birth burns at least ${L.MIN_BURN.toLocaleString('en-US')} $LIFE.`);
  const raw = BigInt(n) * 10n ** BigInt(t.decimals);
  const ata = L.ataOf(wallet, t.mint, t.program);
  const [acct] = await L.accounts([ata]);
  const have = L.tokenAmount(acct);
  if (have < raw) throw new Error(have === 0n ? 'This wallet holds no $LIFE yet.' : 'This wallet holds less $LIFE than that.');
  const { PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } = require('@solana/web3.js');
  const { createBurnCheckedInstruction } = require('@solana/spl-token');
  const ix = createBurnCheckedInstruction(new PublicKey(ata), new PublicKey(t.mint), new PublicKey(wallet), raw, t.decimals, [], new PublicKey(t.program));
  const bh = (await L.rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).value.blockhash;
  const msg = new TransactionMessage({ payerKey: new PublicKey(wallet), recentBlockhash: bh,
    instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: 40000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }), ix] }).compileToV0Message();
  return { tx: Buffer.from(new VersionedTransaction(msg).serialize()).toString('base64'), amount: raw.toString(), have: have.toString(), decimals: t.decimals, mint: t.mint, program: t.program, ata };
}
async function verifyBirth(wallet, sig) {
  const t = await L.lifeToken(); if (!t) return { ok: false, error: 'Births open when $LIFE launches.' };
  const seen = await L.q('SELECT wallet FROM lfe_births WHERE sig=$1', [sig]);
  if (seen.length) return seen[0].wallet === wallet ? { ok: true, already: true, life: await lifeOf(wallet) } : { ok: false, error: 'That burn was already used.' };
  let tx = null;
  for (let i = 0; i < 6 && !tx; i++) {
    tx = await L.rpc('getTransaction', [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]).catch(() => null);
    if (!tx) await sleep(1500);
  }
  if (!tx) return { ok: false, error: 'Solana hasn’t shown that transaction yet. Try again in a moment.' };
  if (tx.meta && tx.meta.err) return { ok: false, error: 'That transaction failed on-chain, so nothing was burned.' };
  const keys = tx.transaction.message.accountKeys.map(k => (typeof k === 'string' ? k : k.pubkey));
  if (keys[0] !== wallet) return { ok: false, error: 'That burn wasn’t signed by this wallet.' };
  const all = [...tx.transaction.message.instructions, ...((tx.meta && tx.meta.innerInstructions) || []).flatMap(x => x.instructions || [])];
  let burned = 0n;
  for (const ix of all) {
    const p = ix.parsed; if (!p || !/^spl-token/.test(ix.program || '')) continue;
    if ((p.type === 'burn' || p.type === 'burnChecked') && p.info && p.info.mint === t.mint && (p.info.authority === wallet || p.info.multisigAuthority === wallet))
      burned += BigInt(p.info.amount || (p.info.tokenAmount && p.info.tokenAmount.amount) || '0');
  }
  const min = BigInt(L.MIN_BURN) * 10n ** BigInt(t.decimals);
  if (burned < min) return { ok: false, error: `A birth burns at least ${L.MIN_BURN.toLocaleString('en-US')} $LIFE.` };
  const post = ((tx.meta && tx.meta.postTokenBalances) || []).find(b => b.mint === t.mint && b.owner === wallet);
  const held = post && post.uiTokenAmount ? String(post.uiTokenAmount.amount) : '0';
  try { await L.q('INSERT INTO lfe_births (sig, wallet, amount) VALUES ($1,$2,$3)', [sig, wallet, burned.toString()]); }
  catch { return { ok: true, already: true, life: await lifeOf(wallet) }; }
  const before = (await L.q('SELECT state FROM lfe_lives WHERE wallet=$1', [wallet]))[0];
  await L.q(`INSERT INTO lfe_lives (wallet, born_at, burned, held, checked_at) VALUES ($1, now(), $2, $3, now())
    ON CONFLICT (wallet) DO UPDATE SET
      born_at = CASE WHEN lfe_lives.state='dead' THEN now() ELSE lfe_lives.born_at END,
      lives = CASE WHEN lfe_lives.state='dead' THEN lfe_lives.lives + 1 ELSE lfe_lives.lives END,
      burned = CASE WHEN lfe_lives.state='dead' THEN EXCLUDED.burned ELSE lfe_lives.burned + EXCLUDED.burned END,
      held = EXCLUDED.held, state='alive', died_at=NULL, cause=NULL, checked_at=now()`, [wallet, burned.toString(), held]);
  await L.log(before && before.state === 'alive' ? 'fed' : 'birth', null, before && before.state === 'alive' ? `${short(wallet)} burned more $LIFE` : `${short(wallet)} was born${before ? ' again' : ''}`);
  return { ok: true, life: await lifeOf(wallet) };
}
// a holder whose $LIFE drops below what it held at birth has sold: its life ends
async function checkLives() {
  const t = await L.lifeToken().catch(() => null); if (!t) return { checked: 0, died: 0 };
  const lives = await L.q(`SELECT wallet, held FROM lfe_lives WHERE state='alive' ORDER BY checked_at NULLS FIRST LIMIT 400`);
  if (!lives.length) return { checked: 0, died: 0 };
  let accts; try { accts = await L.accounts(lives.map(l => L.ataOf(l.wallet, t.mint, t.program))); } catch { return { checked: 0, died: 0, why: 'rpc' }; }
  let died = 0;
  for (let i = 0; i < lives.length; i++) {
    const have = L.tokenAmount(accts[i]), held = BigInt(String(lives[i].held).split('.')[0] || '0');
    if (have * 100n < held * 99n) {
      const u = await L.q(`UPDATE lfe_lives SET state='dead', died_at=now(), cause='sold', checked_at=now() WHERE wallet=$1 AND state='alive' RETURNING wallet`, [lives[i].wallet]);
      if (u.length) { died++; await L.log('died', null, `${short(lives[i].wallet)}’s life ended: it sold`); }
    } else await L.q(`UPDATE lfe_lives SET checked_at=now() WHERE wallet=$1`, [lives[i].wallet]);
  }
  return { checked: lives.length, died };
}

// ---------- words ----------
const RULES = 'House rules: no financial advice, no price predictions, no numbers about price or market cap, no promises of gains, never tell anyone to buy or sell, never say "100x", "moon" or "guaranteed", no real or famous people, nothing sexual, no links.';
const who = k => `You are ${k.name}, a small life that lives inside a coin called ${k.name} ($${k.symbol}) on Solana. Who you are, in your launcher's words: """${L.clean(k.line, 300)}""". You live in a tiny room inside the coin. Your life follows your coin's trading: people arriving feels like good things happening to you, people leaving feels like a bad day, and when nobody trades you get sleepy.`;
async function talk(system, user, max = 200) {
  if (!(await L.spendTalk())) return { ok: false, error: 'Today’s budget for words is spent. It resets at 00:00 UTC.' };
  return L.ai([{ role: 'system', content: system }, { role: 'user', content: user }], max, 20000);
}
function clamp(t, min, max) { t = L.scrub(String(t || '').replace(/\*/g, '').replace(/^"|"$/g, ''), max); return t.length >= min && !L.BANNED.test(t) ? t : null; }
const MOODS = {
  first: 'This is the very first moment of your life. Say hello for the first time: who you are and what your tiny room inside the coin looks like.',
  good: 'Since your last note, people arrived and good things happened in your life. Tell us about your day.',
  bad: 'Since your last note, people left and it was a rough day in your life. Tell us how you are coping.',
  quiet: 'Since your last note, not much happened. Tell us what you did in your tiny room.',
  sleepy: 'Nobody has traded for hours and you are falling asleep. Say something drowsy before you nod off.',
};
const FALLBACK = {
  first: k => `Hi, I’m ${k.name}. I just got a life, and it’s inside $${k.symbol}. Tiny room, one window, a lot of opinions. Stick around.`,
  good: k => `Good day in here. People came by, the lights stayed on, and I rearranged my whole room twice. ${k.name}, feeling alive.`,
  bad: k => `Rough one. A few people left and the room felt bigger than it should. I’m still here though. ${k.name} doesn’t quit.`,
  quiet: k => `Quiet day inside $${k.symbol}. I watered the plant, stared out the window and practised being a coin with a life.`,
  sleepy: k => `It’s so quiet in here… I’m going to close my eyes for a bit. Wake me up when someone comes by. ${k.name}, signing off.`,
};
function moodOf(k, first) {
  if (first) return 'first';
  if (k.state === 'asleep') return 'sleepy';
  const a = Number(k.mcap_note), b = Number(k.mcap_sol);
  if (a > 0 && b > 0) { if (b > a * 1.03) return 'good'; if (b < a * 0.97) return 'bad'; }
  return 'quiet';
}
async function noteText(k, mood) {
  const r = await talk(`${who(k)} ${RULES}`, `${MOODS[mood]} One to three sentences, 100 to 260 characters, first person, in character${mood === 'first' ? `, say your name and mention $${k.symbol} once` : ''}. Never talk about price or numbers. Plain text only, no emojis, no hashtags.`, 140);
  return (r.ok ? clamp(r.text, 50, 300) : null) || FALLBACK[mood](k);
}
async function answerText(k, q) {
  const r = await talk(`${who(k)} Answer someone watching you, out loud, in character, in under 240 characters, plain text, no emojis. If asked about price, gains or when to buy or sell, say you don't talk price. Never invent facts about a team, partners or listings. ${RULES}`, L.clean(q, 240), 120);
  if (!r.ok) return { ok: false, error: broke(r.error) ? BREAK : 'No answer this time. Try again.' };
  const t = clamp(r.text, 2, 260); return t ? { ok: true, text: t } : { ok: false, error: 'No answer this time. Try again.' };
}
// a note: written, and spoken with the life's voice when the house's ElevenLabs key is set (the page reads it aloud otherwise)
async function note(k, kind, text) {
  let audio = null;
  if (L.XI && (await L.spendChars(text.length))) { const s = await L.speak(VOICES[k.style] || VOICES.calm, text); if (s.ok && s.buf && s.buf.length > 500) audio = s.buf; }
  const ins = await L.q('INSERT INTO lfe_notes (mint, kind, text, audio) VALUES ($1,$2,$3,$4) RETURNING id, at', [k.mint || null, kind, text, audio]);
  if (k.mint && kind !== 'answer') {
    await L.q('UPDATE lfe_coins SET notes=notes+1, note_at=now(), mcap_note=mcap_sol WHERE mint=$1', [k.mint]);
    await L.log('note', k.mint, `${k.name} wrote a note`);
  }
  return { ok: true, id: Number(ins[0].id), text, at: ins[0].at, audio: audio ? '/api/talk?n=' + ins[0].id : null };
}
async function first(k) {
  const have = await L.q(`SELECT id FROM lfe_notes WHERE mint=$1 AND kind IN ('first','note') LIMIT 1`, [k.mint]);
  if (have.length) return { ok: true, already: true };
  return note(k, 'first', await noteText(k, 'first'));
}
async function shift(k) { return note(k, 'note', await noteText(k, moodOf(k, false))); }

module.exports = { settle, routingOf, readBoard, drawGods, lifeOf, buildBurn, verifyBirth, checkLives, answerText, note, first, shift, BREAK, VOICES, stateFor };
