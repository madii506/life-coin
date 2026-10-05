// GET /api/board  every coin with a life (newest first), the latest notes, and how the holders' lives are doing, read from
// life's records, which the cycle keeps in step with the chain.
const L = require('./_lib');
const COLS = `mint, slot, name, symbol, seed, style, payer, born_at, state, mcap_sol, complete, last_trade_at, vault_lamports, notes, note_at, jsonb_array_length(gods) AS ngods`;
module.exports = async (req, res) => {
  const base = { open: !!L.STUDIO, studio: L.STUDIO || null, life: L.LIFE_MINT || null, minBurn: L.MIN_BURN, xi: L.XI, split: { yours: L.YOURS, gods: L.GODS, house: L.HOUSE, max: L.MAX_GODS } };
  if (!L.dbReady()) return L.send(res, 200, { ok: true, offline: true, coins: [], notes: [], elders: [], lives: { alive: 0, dead: 0 }, ...base });
  try {
    await L.ready();
    const [coins, notes, counts, elders, solUsd] = await Promise.all([
      L.q(`SELECT ${COLS} FROM lfe_coins WHERE status='live' ORDER BY slot DESC LIMIT 500`),
      L.q(`SELECT n.id, n.mint, n.kind, n.text, n.at, (n.audio IS NOT NULL) AS voiced, c.name, c.symbol, c.seed, c.state, c.style FROM lfe_notes n JOIN lfe_coins c ON c.mint = n.mint
        WHERE n.kind IN ('first','note') ORDER BY n.id DESC LIMIT 30`),
      L.q(`SELECT count(*) FILTER (WHERE state='alive')::int AS alive, count(*) FILTER (WHERE state='dead')::int AS dead FROM lfe_lives`),
      L.q(`SELECT l.wallet, l.born_at, l.lives, (SELECT count(*)::int FROM lfe_coins c WHERE c.status='live' AND c.gods @> jsonb_build_array(jsonb_build_object('wallet', l.wallet))) AS kids
        FROM lfe_lives l WHERE l.state='alive' ORDER BY l.born_at ASC LIMIT 10`),
      L.solPrice().catch(() => null),
    ]);
    L.send(res, 200, { ok: true, coins, notes: notes.map(n => ({ ...n, audio: n.voiced ? '/api/talk?n=' + n.id : null })), lives: counts[0] || { alive: 0, dead: 0 },
      elders: elders.map(e => ({ ...e, ...L.stageOf(e.born_at) })), solUsd, ...base }, L.CACHE(6, 60));
  } catch (e) { L.send(res, 200, { ok: false, error: 'life’s records didn’t answer.', ...base }); }
};
