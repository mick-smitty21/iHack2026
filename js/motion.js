/*
 * motion.js - one place that answers "should things move?" plus tiny fade helpers.
 *
 * Talks to: GSAP (the global `gsap`). Used by table.js, panels.js, sky.js, almanac.js.
 *
 * Say it to a judge: "If the device or our almanac asks for reduced motion, every
 * animation checks here first and swaps its movement for a simple fade."
 *
 * Note: this helper file is not in the original file list. It keeps the
 * reduced-motion rule in one place instead of copying it into every module.
 */

const osPrefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let almanacSwitchOn = false;

/** True when the device setting OR the almanac switch asks for less movement. */
export function motionReduced() {
  return osPrefersReduced.matches || almanacSwitchOn;
}

export function deviceAsksForReducedMotion() {
  return osPrefersReduced.matches;
}

/** Called by almanac.js whenever the switch changes. */
export function setReducedMotionSwitch(isOn) {
  almanacSwitchOn = isOn;
  document.body.classList.toggle('reduce-motion', motionReduced());
}

export function fadeIn(element, seconds = 0.4) {
  gsap.killTweensOf(element);
  gsap.fromTo(element, { opacity: 0 }, { opacity: 1, duration: seconds, ease: 'power1.out' });
}

export function fadeOut(element, onDone, seconds = 0.4) {
  gsap.killTweensOf(element);
  gsap.to(element, { opacity: 0, duration: seconds, ease: 'power1.in', onComplete: onDone });
}

/** A random number between min and max. */
export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

/** Runs `action` again and again, waiting a random minSeconds-maxSeconds each time. */
export function repeatAtRandom(minSeconds, maxSeconds, action) {
  const wait = randomBetween(minSeconds, maxSeconds) * 1000;
  setTimeout(() => {
    action();
    repeatAtRandom(minSeconds, maxSeconds, action);
  }, wait);
}
