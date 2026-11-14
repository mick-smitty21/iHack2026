/*
 * sky.js - everything that depends on the real world: clock hands, the moon's phase
 * and the weather in the window. All of it is drawn in code, not painted.
 *
 * Talks to: table.js (gives it places to draw). motion.js (reduced motion).
 *           From M4: cook.js (window view and time-of-day gradient).
 *
 * Say it to a judge: "Nothing in the window is faked: the clock shows the device's
 * real time and the moon's shape is calculated from today's date."
 *
 * Status: clock, moon and weather (M1), time of day for the cook scene (M4).
 */

import { motionReduced, randomBetween } from './motion.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

/* ---------- Clock ---------- */

// The hands are drawn on a square that covers the round face (the top of
// obj-clock.png; table.css sizes it). On that square's 100x100 grid the middle of
// the face is here. Change these two numbers if the clock art is replaced.
const CLOCK_CENTER = { x: 50, y: 50.5 };

/** Returns an SVG with an hour and a minute hand that follow the device's clock. */
export function createClockHands() {
  const svg = svgElement('svg', { viewBox: '0 0 100 100', class: 'clock-hands', 'aria-hidden': 'true' });
  const hourHand = makeHand(19, 3.2);
  const minuteHand = makeHand(29, 2.1);
  const pin = svgElement('circle', { cx: CLOCK_CENTER.x, cy: CLOCK_CENTER.y, r: 2.6, class: 'clock-pin' });
  svg.append(hourHand, minuteHand, pin);

  const update = () => pointHands(hourHand, minuteHand, new Date());
  update();
  setInterval(update, 1000);
  return svg;
}

function makeHand(length, width) {
  return svgElement('line', {
    x1: CLOCK_CENTER.x, y1: CLOCK_CENTER.y + 3,
    x2: CLOCK_CENTER.x, y2: CLOCK_CENTER.y - length,
    'stroke-width': width, 'stroke-linecap': 'round', class: 'clock-hand',
  });
}

function pointHands(hourHand, minuteHand, now) {
  const minutes = now.getMinutes() + now.getSeconds() / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  turn(minuteHand, minutes * 6);  // 360 degrees / 60 minutes
  turn(hourHand, hours * 30);     // 360 degrees / 12 hours
}

function turn(hand, degrees) {
  hand.setAttribute('transform', `rotate(${degrees} ${CLOCK_CENTER.x} ${CLOCK_CENTER.y})`);
}

/* ---------- Moon ---------- */

const SYNODIC_MONTH_DAYS = 29.530588853;                 // new moon to new moon
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);     // 6 Jan 2000, 18:14 UTC
const MS_PER_DAY = 86400000;

/** 0 = new moon, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter. */
export function moonPhase(date = new Date()) {
  const daysSince = (date.getTime() - KNOWN_NEW_MOON) / MS_PER_DAY;
  const cycles = daysSince / SYNODIC_MONTH_DAYS;
  return cycles - Math.floor(cycles);
}

/** Returns an SVG moon showing today's phase. */
export function createMoon(date = new Date()) {
  const svg = svgElement('svg', { viewBox: '-12 -12 24 24', class: 'moon', 'aria-hidden': 'true' });
  svg.append(
    svgElement('circle', { r: 11.5, class: 'moon-glow' }),
    svgElement('circle', { r: 10, class: 'moon-dark' }),
    svgElement('path', { d: litMoonPath(moonPhase(date), 10), class: 'moon-lit' }),
  );
  return svg;
}

// The lit part is drawn as two curves that meet at the top and bottom of the disc:
// half of the moon's round edge, plus the "terminator" (the edge of the shadow),
// which is half an ellipse that gets thinner and fatter as the month goes on.
function litMoonPath(phase, radius) {
  const waxing = phase < 0.5;                          // waxing moons are lit on the right
  const terminatorWidth = Math.abs(Math.cos(phase * 2 * Math.PI)) * radius;
  const moreThanHalfLit = phase > 0.25 && phase < 0.75;

  const edgeSweep = waxing ? 1 : 0;                    // right edge or left edge
  // WHY: an SVG arc's sweep flag picks which way it bulges. A crescent's terminator
  // bulges toward the lit edge; a gibbous moon's bulges away from it.
  const terminatorSweep = moreThanHalfLit === waxing ? 1 : 0;

  return `M 0 ${-radius} `
    + `A ${radius} ${radius} 0 0 ${edgeSweep} 0 ${radius} `
    + `A ${terminatorWidth} ${radius} 0 0 ${terminatorSweep} 0 ${-radius} Z`;
}

/* ---------- Weather in the window ---------- */

const PARTICLE_COUNT = { clouds: 5, rain: 70, snow: 55 };

/**
 * Draws clouds, rain or snow on a canvas inside `host` (the window glass).
 * Returns { set(weather, isNight) } so table.js can change it.
 */
export function createWeather(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'weather';
  host.append(canvas);

  const state = { weather: 'clear', isNight: true, particles: [], frameRequest: null };
  const context = canvas.getContext('2d');

  // WHY: a canvas has its own pixel size, separate from its CSS size. Keep them in
  // step whenever the stage is resized, or the drawing goes blurry or stretched.
  new ResizeObserver(() => {
    canvas.width = host.clientWidth;
    canvas.height = host.clientHeight;
    drawFrame(context, state, false);
  }).observe(host);

  function set(weather, isNight) {
    state.weather = weather;
    state.isNight = isNight;
    state.particles = makeParticles(weather);
    restart();
  }

  function restart() {
    cancelAnimationFrame(state.frameRequest);
    drawFrame(context, state, false);
    if (state.weather !== 'clear' && !motionReduced()) animate();
  }

  function animate() {
    drawFrame(context, state, true);
    state.frameRequest = requestAnimationFrame(animate);
  }

  return { set, refresh: restart };
}

// Every particle lives in a 0-1 square so it doesn't care how big the window is.
function makeParticles(weather) {
  const count = PARTICLE_COUNT[weather] || 0;
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: randomBetween(0.6, 1.4),
    speed: randomBetween(0.7, 1.3),
    wobble: Math.random() * Math.PI * 2,
  }));
}

function drawFrame(context, state, shouldMove) {
  const { width, height } = context.canvas;
  context.clearRect(0, 0, width, height);
  if (state.weather === 'clear' || !width) return;

  for (const particle of state.particles) {
    if (shouldMove) moveParticle(particle, state.weather);
    drawParticle(context, particle, state, width, height);
  }
}

function moveParticle(particle, weather) {
  if (weather === 'clouds') {
    particle.x += 0.0004 * particle.speed;
    if (particle.x > 1.3) particle.x = -0.3;
  } else if (weather === 'rain') {
    particle.y += 0.03 * particle.speed;
    particle.x -= 0.004 * particle.speed;
  } else if (weather === 'snow') {
    particle.wobble += 0.02;
    particle.y += 0.003 * particle.speed;
    particle.x += Math.sin(particle.wobble) * 0.0012;
  }
  if (particle.y > 1.05) { particle.y = -0.05; particle.x = Math.random(); }
}

function drawParticle(context, particle, state, width, height) {
  const x = particle.x * width;
  const y = particle.y * height;
  if (state.weather === 'clouds') drawCloud(context, x, y * 0.45, width * 0.11 * particle.size, state.isNight);
  if (state.weather === 'rain') drawRaindrop(context, x, y, height * 0.07 * particle.size);
  if (state.weather === 'snow') drawSnowflake(context, x, y, width * 0.008 * particle.size);
}

function drawCloud(context, x, y, size, isNight) {
  context.fillStyle = isNight ? 'rgba(96, 104, 128, 0.55)' : 'rgba(250, 243, 224, 0.8)';
  context.beginPath();
  context.ellipse(x, y, size, size * 0.45, 0, 0, Math.PI * 2);
  context.ellipse(x - size * 0.5, y + size * 0.12, size * 0.6, size * 0.32, 0, 0, Math.PI * 2);
  context.ellipse(x + size * 0.55, y + size * 0.1, size * 0.65, size * 0.35, 0, 0, Math.PI * 2);
  context.fill();
}

function drawRaindrop(context, x, y, length) {
  context.strokeStyle = 'rgba(214, 224, 232, 0.55)';
  context.lineWidth = Math.max(1, length * 0.06);
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x - length * 0.13, y + length);
  context.stroke();
}

function drawSnowflake(context, x, y, radius) {
  context.fillStyle = 'rgba(250, 243, 224, 0.9)';
  context.beginPath();
  context.arc(x, y, Math.max(1, radius), 0, Math.PI * 2);
  context.fill();
}

/* ---------- Time of day (cook scene) ---------- */

// Each part of the day starts at `from` o'clock. cook.css has one sky gradient and
// one soft colour wash per name (.time-dawn, .time-day, .time-dusk, .time-night).
const PARTS_OF_DAY = [
  { name: 'night', from: 0 },   // midnight to 5 am: deep indigo
  { name: 'dawn', from: 5 },    // 5-9 am: peach
  { name: 'day', from: 9 },     // 9 am-4 pm: pale gold
  { name: 'dusk', from: 16 },   // 4-8 pm: orange-rose
  { name: 'night', from: 20 },  // 8 pm on: deep indigo
];

/** "dawn", "day", "dusk" or "night", from the device's own clock. */
export function timeOfDay(date = new Date()) {
  const hour = date.getHours();
  let current = PARTS_OF_DAY[0];
  for (const part of PARTS_OF_DAY) {
    if (hour >= part.from) current = part;
  }
  return current.name;
}
