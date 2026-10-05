// GET /api/kid?mint=  one coin and the life inside it: its record, its notes, what happened to it, and its godparents
// (with how each one's own life is doing now).
const L = require('./_lib');
const COLS = `mint, slot, name, symbol, line, style, seed, xhandle, payer, shares, gods, draw, born_at, status, state, mcap_sol, complete, last_trade_at, vault_lamports, created_at, notes, note_at`;
module.exports = async (req, res) => {
  const mint = String(L.query(req).mint || '').trim();
  if (!L.isAddr(mint)) return L.send(res, 200, { ok: false, error: 'That isn’t a token address.' });
  if (!L.dbReady()) return L.send(res, 200, { ok: false, error: 'life’s records are offline.' });
  try {
    await L.ready();
    const k = (await L.q(`SELECT ${COLS} FROM lfe_coins WHERE mint=$1`, [mint]))[0];
    if (!k || k.status === 'void') return L.send(res, 200, { ok: false, missing: true, error: 'No life lives at that address.' }, L.CACHE(10));
    const gods = typeof k.gods === 'string' ? JSON.parse(k.gods) : (k.gods || []);
    const [notes, log, lives, solUsd] = await Promise.all([
      L.q(`SELECT id, kind, text, at, (audio IS NOT NULL) AS voiced FROM lfe_notes WHERE mint=$1 AND kind IN ('first','note') ORDER BY id DESC LIMIT 60`, [mint]),
      L.q(`SELECT kind, text, at FROM lfe_log WHERE mint=$1 ORDER BY id DESC LIMIT 20`, [mint]),
      gods.length ? L.q(`SELECT wallet, born_at, state FROM lfe_lives WHERE wallet = ANY($1)`, [gods.map(g => g.wallet)]) : [],
      L.solPrice().catch(() => null),
    ]);
    const now = new Map(lives.map(l => [l.wallet, l]));
    const godsNow = gods.map(g => { const l = now.get(g.wallet); return { ...g, alive: !!(l && l.state === 'alive'), now: l && l.state === 'alive' ? L.stageOf(l.born_at).stage : 'dead' }; });
    L.send(res, 200, { ok: true, coin: { ...k, gods: godsNow }, notes: notes.map(n => ({ ...n, audio: n.voiced ? '/api/talk?n=' + n.id : null })), log, solUsd,
      studio: L.STUDIO || null, xi: L.XI }, L.CACHE(5, 60));
  } catch (e) { L.send(res, 200, { ok: false, error: 'life’s records didn’t answer.' }); }
};
