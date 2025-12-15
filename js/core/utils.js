"use strict";

export const pkToPlayer = pk => pk === 'p1' ? 'player1' : 'p2';
export const oppPk = pk => pk === 'p1' ? 'p2' : 'p1';
export const parseInt10 = (v, def = 0) => parseInt(v, 10) || def;
export const normStr = s => String(s || '').trim().toLowerCase().replace(/['']/g, "'").replace(/\s+/g, ' ');

export function shuffleDeckAndAnimate(state, pk) {
  const deck = state[pk]?.deck || [];
  if (deck.length > 0) {
    shuffleArray(deck);

    const owner = pk === 'p1' ? 'player1' : 'player2';
    if (globalThis.animateDeckShuffle) {
      globalThis.animateDeckShuffle(owner);
    }
  }
}

export async function animateCardDrawFromSearch(pk, card = null) {
  const owner = pk === 'p1' ? 'player1' : 'player2';
  if (globalThis.animateCardDraw) {
    const handDiv = owner === 'player1' ?
      (globalThis.p1HandDiv || document.getElementById('p1Hand')) :
      (globalThis.p2HandDiv || document.getElementById('p2Hand'));
    if (handDiv) {

      const currentHandSize = globalThis.playerState?.[owner]?.hand?.length || 0;
      await globalThis.animateCardDraw(owner, handDiv, card, currentHandSize, 1);
    }
  }
}

export async function animateMultipleCardDraws(pk, count, cards = null) {
  const owner = pk === 'p1' ? 'player1' : 'player2';
  if (globalThis.animateCardDraw && count > 0) {
    const handDiv = owner === 'player1' ?
      (globalThis.p1HandDiv || document.getElementById('p1Hand')) :
      (globalThis.p2HandDiv || document.getElementById('p2Hand'));
    if (handDiv) {
      const currentHandSize = globalThis.playerState?.[owner]?.hand?.length || 0;
      for (let i = 0; i < count; i++) {
        const card = cards && cards[i] ? cards[i] : null;
        await globalThis.animateCardDraw(owner, handDiv, card, currentHandSize + i, count);
      }
    }
  }
}

export function parseCSV(text) {
  const rows = []; let i = 0, f = '', row = [], q = false;
  const pf = () => { row.push(f); f = ''; };
  const pr = () => { if (row.length) rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { f += '"'; i += 2; continue; }
      if (c === '"') { q = false; i++; continue; }
      f += c; i++; continue;
    } else {
      if (c === '"') { q = true; i++; continue; }
      if (c === ',') { pf(); i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { pf(); pr(); i++; continue; }
      f += c; i++; continue;
    }
  }
  if (f.length || row.length) { pf(); pr(); }
  const [h, ...b] = rows;
  if (!h) return [];
  return b.map(r => Object.fromEntries(h.map((k, ix) => [k.trim(), (r[ix] ?? '').trim()])));
}

export const csvIdFor = (set, num) => `${set}-${String(num).padStart(3, '0')}`;

export function getAbilityCardKey(set, num, img) {
  if (img && img.dataset.instanceId) {
    return `instance-${img.dataset.instanceId}`;
  }
  const normalizedSet = String(set || '').toUpperCase();
  const normalizedNum = String(num || '').padStart(3, '0');
  return `${normalizedSet}-${normalizedNum}`;
}

export function abilityRequiresActive(row) {
  const txt = (row.text || '').toLowerCase();
  return txt.includes('if this pokémon is in the active spot') ||
         txt.includes('as long as this pokémon is in the active spot');
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

