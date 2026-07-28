#!/usr/bin/env node
/**
 * fetch-stars.js
 * Holt die Stern-Zahlen aller öffentlichen Repos von GitHub
 * und schreibt sie als statische Datei nach stars.json (Repo-Root).
 *
 * Läuft serverseitig in der GitHub Action – kein Besucher der Seite
 * kontaktiert jemals die GitHub-API (DSGVO-freundlich: die Seite lädt
 * nur die statische stars.json vom eigenen Origin).
 *
 * Benötigt Node 18+ (natives fetch), keine Abhängigkeiten.
 */

const fs = require('fs');

const USER = 'FlorianLoyns';
const OUT = 'stars.json';

async function fetchAllRepos() {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'florianloyns-stars-updater',
  };
  // In der Action gesetzt – vermeidet das Rate-Limit von 60 Anfragen/Stunde
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = 'Bearer ' + process.env.GITHUB_TOKEN;
  }

  const repos = [];
  for (let page = 1; page <= 10; page++) {
    const url = `https://api.github.com/users/${USER}/repos?per_page=100&page=${page}&type=owner`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`GitHub-API antwortet mit HTTP ${res.status} für ${url}`);
    }
    const batch = await res.json();
    repos.push(...batch);
    if (batch.length < 100) break; // letzte Seite erreicht
  }
  return repos;
}

(async () => {
  const repos = await fetchAllRepos();

  const map = {};
  const versions = {};
  let total = 0;
  for (const repo of repos) {
    if (repo.fork || repo.private) continue; // nur eigene, öffentliche Repos
    map[repo.name.toLowerCase()] = repo.stargazers_count;
    total += repo.stargazers_count;
  }

  // Versionen der reveal.js-Plugins aus deren package.json lesen
  for (const repo of repos) {
    if (repo.fork || repo.private) continue;
    if (!repo.name.toLowerCase().startsWith('reveal.js-')) continue;
    const branch = repo.default_branch || 'main';
    const url = `https://raw.githubusercontent.com/${USER}/${repo.name}/${branch}/package.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue; // kein package.json -> einfach keine Version anzeigen
      const pkg = await res.json();
      if (pkg.version) versions[repo.name.toLowerCase()] = pkg.version;
    } catch (e) {
      console.warn(`Version für ${repo.name} nicht lesbar: ${e.message}`);
    }
  }

  // alphabetisch sortiert, damit die Datei stabile, gut lesbare Diffs erzeugt
  const sorted = Object.fromEntries(
    Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
  );

  const sortedVersions = Object.fromEntries(
    Object.entries(versions).sort((a, b) => a[0].localeCompare(b[0]))
  );

  const out = {
    updated: new Date().toISOString(),
    user: USER,
    total,
    repos: sorted,
    versions: sortedVersions,
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`OK: ${Object.keys(sorted).length} Repos, ${total} Sterne, ${Object.keys(sortedVersions).length} Plugin-Versionen → ${OUT}`);
})().catch((err) => {
  console.error('Fehler beim Abrufen der Sterne:', err.message);
  process.exit(1);
});
