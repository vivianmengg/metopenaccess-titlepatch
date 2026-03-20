// fetch-title-patch.js
//
// Queries the Met Collection API for every object listed as "Untitled" in a
// MetObjects.csv extract, and collects the real titles where the API has them.
//
// Output: title-patch.json — a mapping of objectID → title for all objects
// where the CSV says "Untitled" but the API returns a real title.
//
// Usage:
//   1. Export your untitled Chinese ceramics object IDs from MetObjects.csv
//      into a JSON file: [ 36447, 39523, ... ]
//      (filter: Department = "Asian Art", Medium contains ceramic terms, Title = "Untitled")
//   2. Save as untitled-ids.json in the same directory
//   3. node fetch-title-patch.js
//
// The script is checkpoint-based — safe to interrupt and re-run. Progress is
// saved every 20 objects so you never lose work.

import { readFile, writeFile } from 'fs/promises';

const MET_BASE   = 'https://collectionapi.metmuseum.org/public/collection/v1';
const INPUT      = './untitled-ids.json';
const CHECKPOINT = './title-patch-checkpoint.json';
const OUTPUT     = './title-patch.json';
const DELAY_MS   = 1300; // Met API rate limit — do not reduce

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url, retries = 6) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 || res.status === 403) {
        const wait = 3000 * (i + 1);
        process.stdout.write(` [rate-limited, waiting ${wait / 1000}s]`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i < retries - 1) await sleep(1000 * (i + 1));
      else throw e;
    }
  }
}

async function main() {
  // Load input IDs
  const ids = JSON.parse(await readFile(INPUT, 'utf8'));
  console.log(`Loaded ${ids.length} untitled object IDs from ${INPUT}\n`);

  // Load checkpoint
  let checkpoint = {};
  try {
    checkpoint = JSON.parse(await readFile(CHECKPOINT, 'utf8'));
    console.log(`Resuming — ${Object.keys(checkpoint).length} objects already checked`);
  } catch {
    console.log('No checkpoint found, starting fresh');
  }

  // Build queue of IDs not yet checked
  const queue = ids.filter(id => checkpoint[id] === undefined);
  console.log(`${queue.length} remaining\n`);

  let done = 0;

  for (const id of queue) {
    process.stdout.write(`\r  [${done + 1}/${queue.length}] #${String(id).padEnd(8)}`);
    try {
      const obj = await fetchWithRetry(`${MET_BASE}/objects/${id}`);
      const title = obj.title?.trim();
      checkpoint[id] = (title && title !== 'Untitled') ? title : null;
    } catch {
      // Leave unchecked — will be retried on next run
    }

    done++;
    if (done % 20 === 0) {
      await writeFile(CHECKPOINT, JSON.stringify(checkpoint));
    }
    await sleep(DELAY_MS);
  }

  await writeFile(CHECKPOINT, JSON.stringify(checkpoint));
  console.log(`\n\nDone. Building patch file...\n`);

  // Write output — only objects where the API had a real title
  const patch = {};
  for (const [id, title] of Object.entries(checkpoint)) {
    if (title) patch[id] = title;
  }

  await writeFile(OUTPUT, JSON.stringify(patch, null, 2));
  console.log(`Wrote ${OUTPUT} — ${Object.keys(patch).length} titles found out of ${ids.length} objects checked`);
}

main().catch(console.error);
