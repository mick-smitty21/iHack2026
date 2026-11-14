/*
 * fetch-recipe.js - the site's only server code: fetches a recipe web page and
 * returns the recipe data that page already publishes (schema.org Recipe JSON-LD).
 *
 * Talks to: js/importer.js calls it at /.netlify/functions/fetch-recipe?url=...
 *
 * Say it to a judge: "Browsers aren't allowed to read other websites directly, so
 * this one small function fetches the page for us and picks out the recipe data
 * the site already publishes for search engines. No AI and no API keys."
 *
 * Answers with JSON:
 *   found      { found: true,  title, ingredients[], steps[], servings, sourceUrl }
 *   not found  { found: false, title (if the page had one), ..., error: Grandma's note }
 *   refused    { found: false, error: Grandma's note, detail: the technical reason }
 */

const dns = require('dns').promises;
const net = require('net');

const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;
const MAX_PAGE_CHARACTERS = 3000000;
const GRANDMAS_NOTE = "I couldn't make that one out. Want to write it out instead?";

exports.handler = async function handler(event) {
  const address = (event.queryStringParameters || {}).url;
  try {
    const url = parseWebAddress(address);
    const html = await fetchPage(url);
    const recipe = readRecipeFromHtml(html);
    return reply(200, { ...recipe, sourceUrl: url.href, error: recipe.found ? undefined : GRANDMAS_NOTE });
  } catch (problem) {
    // WHY status 200 even for a failure: our function did its job; it is the recipe
    // page that was missing, slow or off-limits. The site reads "found: false" and shows
    // Grandma's note. (A 4xx/5xx here would also paint a red error in the browser console.)
    return reply(200, { found: false, error: GRANDMAS_NOTE, detail: problem.message, problemCode: problem.status || 502 });
  }
};

function reply(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
}

function refuse(status, message) {
  const problem = new Error(message);
  problem.status = status;
  return problem;
}

/* ---------- Safety: only public http(s) pages ---------- */

function parseWebAddress(address) {
  let url;
  try {
    url = new URL(String(address || '').trim());
  } catch {
    throw refuse(400, 'That is not a web address.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw refuse(400, 'Only http and https addresses are allowed.');
  }
  return url;
}

// WHY: without this, someone could ask our function to fetch pages from inside
// Netlify's own network (addresses like 10.x.x.x or localhost) and read things the
// public should never see. So we look up where the name really points and refuse
// anything private.
async function assertPublicHost(url) {
  const host = url.hostname.replace(/^\[|\]$/g, ''); // IPv6 addresses come in [brackets]
  if (/(^|\.)localhost$|\.local$|\.internal$/i.test(host)) {
    throw refuse(400, 'Local addresses are not allowed.');
  }
  let addresses;
  try {
    addresses = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((entry) => entry.address);
  } catch {
    throw refuse(502, 'That site could not be found.');
  }
  if (addresses.some(isPrivateAddress)) throw refuse(400, 'Private addresses are not allowed.');
}

function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168);
  }
  const lower = ip.toLowerCase();
  if (lower.startsWith('::ffff:')) return isPrivateAddress(lower.slice(7)); // IPv4 in disguise
  return lower === '::' || lower === '::1' || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
}

/* ---------- Fetching, with a time limit ---------- */

async function fetchPage(startUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await followRedirectsSafely(startUrl, controller.signal);
    if (!response.ok) throw refuse(502, `The site answered with error ${response.status}.`);
    const html = await response.text();
    return html.slice(0, MAX_PAGE_CHARACTERS);
  } catch (problem) {
    if (problem.name === 'AbortError') throw refuse(504, 'The site took longer than 8 seconds to answer.');
    throw problem.status ? problem : refuse(502, 'The site could not be reached.');
  } finally {
    clearTimeout(timer);
  }
}

// WHY: we follow redirects ourselves so each new address gets the same safety check.
// Otherwise a public page could redirect us to a private one.
async function followRedirectsSafely(startUrl, signal) {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicHost(url);
    const response = await fetch(url, {
      signal,
      redirect: 'manual',
      headers: {
        // Many recipe sites turn away anything that doesn't look like a browser.
        'User-Agent': 'Mozilla/5.0 (compatible; GrandmasRecipeBox/1.0; +recipe card import)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const nextPlace = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !nextPlace) return response;
    url = parseWebAddress(new URL(nextPlace, url).href);
  }
  throw refuse(502, 'The site redirected too many times.');
}

/* ---------- Finding the recipe in the page ---------- */

function readRecipeFromHtml(html) {
  const recipe = findRecipe(readJsonLdBlocks(html));
  if (!recipe) {
    return { found: false, title: readPageTitle(html), ingredients: [], steps: [], servings: null };
  }
  const ingredients = toList(recipe.recipeIngredient || recipe.ingredients).map(cleanText).filter(Boolean);
  const steps = readSteps(recipe.recipeInstructions);
  return {
    found: ingredients.length > 0 || steps.length > 0,
    title: cleanText(recipe.name) || readPageTitle(html),
    ingredients,
    steps,
    servings: readServings(recipe.recipeYield),
  };
}

// Pages put this data in <script type="application/ld+json"> ... </script> blocks.
function readJsonLdBlocks(html) {
  const blocks = [];
  const pattern = /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch {
      // A page with broken JSON in one block may still have a good one elsewhere.
    }
  }
  return blocks;
}

// The Recipe can be the block itself, an item in a list, or tucked inside "@graph".
function findRecipe(data) {
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipe(item);
      if (found) return found;
    }
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  if (toList(data['@type']).includes('Recipe')) return data;
  return findRecipe(data['@graph'] || null);
}

// Instructions come as one string, a list of strings, a list of HowToStep objects,
// or HowToSection objects that each hold their own list of steps.
function readSteps(instructions) {
  if (typeof instructions === 'string') return splitIntoSteps(cleanText(instructions, true));
  const steps = [];
  for (const item of toList(instructions)) {
    if (typeof item === 'string') steps.push(...splitIntoSteps(cleanText(item, true)));
    else if (item && item.itemListElement) steps.push(...readSteps(item.itemListElement));
    else if (item) steps.push(cleanText(item.text || item.name));
  }
  return steps.filter(Boolean);
}

function splitIntoSteps(text) {
  return text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

// "4 servings", ["4", "4 servings"] and 4 all mean 4.
function readServings(recipeYield) {
  for (const value of toList(recipeYield)) {
    const number = parseInt(String(value).match(/\d+/), 10);
    if (number > 0) return number;
  }
  return null;
}

function readPageTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanText(match[1]) : '';
}

function toList(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', deg: '°', frac12: '½', frac14: '¼', frac34: '¾' };

/** Strips HTML tags and decodes things like &amp; and &#39;. */
function cleanText(value, keepLineBreaks = false) {
  if (typeof value !== 'string') return '';
  const text = value
    .replace(/<\/(p|li|div)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z0-9]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] || whole);
  const tidy = keepLineBreaks ? text.replace(/[ \t]+/g, ' ') : text.replace(/\s+/g, ' ');
  return tidy.trim();
}

// For tests only: lets a test script try the parsing without fetching anything.
exports.readRecipeFromHtml = readRecipeFromHtml;
exports.isPrivateAddress = isPrivateAddress;
