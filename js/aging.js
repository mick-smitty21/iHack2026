/*
 * aging.js - decides how worn a card looks: which stage it's at (from how many times
 * it's been cooked) and where its stains sit.
 *
 * Talks to: assets.js (overlay pictures), motion.js (random numbers). Used by card.js.
 *
 * Say it to a judge: "A card's wear comes from how many times you've cooked it, and
 * the stain positions are rolled once and saved with the card, so it always looks
 * the same - like a real card that has its own particular coffee ring."
 */

import { createAsset } from './assets.js';
import { randomBetween } from './motion.js';

export const STAGE_NAMES = ['Crisp', 'Softened', 'Stained', 'Well-loved'];

/** 0 uses = stage 0 (crisp), 1-2 = 1 (softened), 3-5 = 2 (stained), 6+ = 3 (well-loved). */
export function agingStage(uses) {
  if (uses >= 6) return 3;
  if (uses >= 3) return 2;
  if (uses >= 1) return 1;
  return 0;
}

/**
 * Rolls the dice once for a new card. x and y are the centre of each mark as a
 * percentage of the card; size is its width as a percentage of the card's width.
 * The ranges keep marks toward the edges and corners so the recipe stays readable.
 */
export function makeAgingLayout() {
  return {
    coffeeRing:  makeSpot({ x: [62, 86], y: [48, 76], size: 26 }),
    fingerprint: makeSpot({ x: [5, 14],  y: [62, 86], size: 11 }),
    grease:      makeSpot({ x: [70, 90], y: [80, 92], size: 18 }),
    tape:        { x: randomBetween(30, 60), y: 2, size: 24, rotation: randomBetween(-5, 5) },
    pencil:      { x: 50, y: 50, size: 100, rotation: Math.random() < 0.5 ? 0 : 180 },
  };
}

function makeSpot({ x, y, size }) {
  return {
    x: randomBetween(x[0], x[1]),
    y: randomBetween(y[0], y[1]),
    size,
    rotation: randomBetween(0, 360),
  };
}

// Which overlays appear from which stage on.
const OVERLAYS = [
  { asset: 'age-yellowing',   from: 1, fixed: { x: 50, y: 50, size: 100, rotation: 0 } },
  { asset: 'age-coffee-ring', from: 2, spot: 'coffeeRing' },
  { asset: 'age-pencil',      from: 2, spot: 'pencil' },
  { asset: 'age-fingerprint', from: 2, spot: 'fingerprint' },
  { asset: 'age-corner',      from: 3, fixed: { x: 93, y: 11.5, size: 14, rotation: 0 } },
  { asset: 'age-tape',        from: 3, spot: 'tape' },
  { asset: 'age-grease',      from: 3, spot: 'grease' },
];

/** Builds the layer of wear that sits over a card face. */
export function buildAgingLayer(card) {
  const stage = agingStage(card.uses);
  const layer = document.createElement('div');
  layer.className = 'card-aging';

  for (const overlay of OVERLAYS) {
    if (stage < overlay.from) continue;
    const place = overlay.fixed || card.agingLayout[overlay.spot];
    layer.append(makeOverlay(overlay.asset, place));
  }
  return layer;
}

function makeOverlay(assetId, { x, y, size, rotation }) {
  const mark = document.createElement('div');
  mark.className = 'age-mark ' + assetId;
  mark.style.left = x + '%';
  mark.style.top = y + '%';
  mark.style.width = size + '%';
  mark.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  mark.append(createAsset(assetId));
  return mark;
}
