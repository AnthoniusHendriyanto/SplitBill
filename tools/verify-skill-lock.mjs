#!/usr/bin/env node

/**
 * Verifies that the vendored security-audit skill still matches the hash
 * recorded in skills-lock.json.
 *
 * The Skills CLI hashes a skill folder by walking every file, sorting the
 * relative paths with localeCompare, and feeding each path and its bytes into
 * a single SHA-256 digest. This script reproduces that algorithm so a pull
 * request that edits the vendored skill fails CI instead of silently changing
 * the instructions every agent will follow.
 *
 * Usage: node tools/verify-skill-lock.mjs <skill-dir> <lock-file>
 */

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules']);

async function collectFiles(baseDir, currentDir, results) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await collectFiles(baseDir, fullPath, results);
    } else if (entry.isFile()) {
      results.push({
        relativePath: relative(baseDir, fullPath).split('\\').join('/'),
        content: await readFile(fullPath),
      });
    }
  }
}

async function computeSkillFolderHash(skillDir) {
  const files = [];
  await collectFiles(skillDir, skillDir, files);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file.relativePath);
    hash.update(file.content);
  }
  return hash.digest('hex');
}

function fail(message) {
  console.error(`skill lock check failed: ${message}`);
  process.exit(1);
}

const [skillDir, lockPath] = process.argv.slice(2);
if (!skillDir || !lockPath) {
  console.error('Usage: node tools/verify-skill-lock.mjs <skill-dir> <lock-file>');
  process.exit(1);
}

const lock = JSON.parse(await readFile(lockPath, 'utf8'));
const skills = Object.entries(lock.skills ?? {});
if (!skills.length) fail(`${lockPath} lists no skills`);

for (const [name, entry] of skills) {
  const installedDir = join(skillDir, name);
  let actual;
  try {
    actual = await computeSkillFolderHash(installedDir);
  } catch (error) {
    fail(`cannot read ${installedDir}: ${error.message}`);
  }
  if (actual !== entry.computedHash) {
    fail(
      `${name} does not match skills-lock.json\n` +
        `  expected ${entry.computedHash}\n` +
        `  actual   ${actual}\n` +
        `  The vendored skill was changed after it was pinned. Re-install it with\n` +
        `  "npx skills add ${entry.source} --skill ${name} --agent opencode --copy -y"\n` +
        `  and commit the refreshed skills-lock.json.`
    );
  }
  console.log(`${name}: ok (${actual.slice(0, 12)})`);
}
