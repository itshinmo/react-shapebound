import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';

const root = process.cwd();
const ignoredDirectories = new Set(['.git', '.ai/specs', 'coverage', 'dist', 'node_modules']);
const ignoredFiles = new Set(['.ai/templates/adr.md']);
const markdownExtensions = new Set(['.md', '.mdx']);
const linkPattern = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

async function collectMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    const relative = absolute.slice(root.length + 1);

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(relative)) {
        continue;
      }
      files.push(...(await collectMarkdown(absolute)));
      continue;
    }

    if (markdownExtensions.has(extname(entry.name)) && !ignoredFiles.has(relative)) {
      files.push(absolute);
    }
  }

  return files;
}

function isExternal(target) {
  return /^(https?:|mailto:|tel:|#)/.test(target);
}

function stripLocation(target) {
  return target.split('#')[0]?.split('?')[0] ?? '';
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

const files = await collectMarkdown(root);
const missing = [];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const relativeFile = file.slice(root.length + 1);

  for (const match of source.matchAll(linkPattern)) {
    const rawTarget = match[1];

    if (rawTarget === undefined || isExternal(rawTarget)) {
      continue;
    }

    const target = stripLocation(rawTarget);
    if (target.length === 0) {
      continue;
    }

    const absoluteTarget = target.startsWith('/')
      ? resolve(root, target.slice(1))
      : resolve(dirname(file), target);

    if (!(await pathExists(absoluteTarget))) {
      missing.push(`${relativeFile} → ${rawTarget}`);
    }
  }
}

if (missing.length > 0) {
  console.error('Broken relative Markdown links:');
  for (const entry of missing) {
    console.error(`- ${entry}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Markdown links OK (${files.length} files scanned).`);
}
