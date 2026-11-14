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
 * M0 status: stub that always answers with Grandma's note. Built in M3
 * (http/https only, private addresses refused, 8-second timeout, JSON-LD parsing).
 */

const GRANDMAS_NOTE = "I couldn't make that one out. Want to write it out instead?";

exports.handler = async function handler() {
  return {
    statusCode: 501,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ error: GRANDMAS_NOTE, detail: 'Link reading arrives in milestone M3.' }),
  };
};
