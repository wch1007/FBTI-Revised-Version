import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateQuestions } from '../scoring.js';
validateQuestions(JSON.parse(await readFile(new URL('../questions.json', import.meta.url), 'utf8')), JSON.parse(await readFile(new URL('../scoring-map.json', import.meta.url), 'utf8')));
const output = new URL('../dist/', import.meta.url);
await mkdir(output, { recursive: true });
// Publish only public site assets: no tooling, local state or upstream login data.
const files = ['index.html', 'styles.css', 'app.js', 'scoring.js', 'report.js', 'questions.json', 'scoring-map.json', 'results.json', 'icon.svg', '.nojekyll', 'standalone.html'];
const results = JSON.parse(await readFile(new URL('../results.json', import.meta.url), 'utf8'));
await mkdir(new URL('image/fbti/', output), { recursive: true });
for (const result of Object.values(results)) {
  if (!/^image\/fbti\/[A-Z]{4}\.png$/.test(result.image)) throw new Error('Invalid artwork path');
  files.push(result.image);
}
for (const file of files) await copyFile(new URL('../' + file, import.meta.url), new URL(file, output));
// One deterministic revision for the full module graph, CSS and data. Changing
// any of them yields new URLs; old browser caches cannot mix releases.
const textFiles = files.filter(file => /\.(js|css|json|html)$/.test(file));
const contents = await Promise.all(textFiles.map(file => readFile(new URL('../' + file, import.meta.url), 'utf8')));
const revision = createHash('sha256').update(contents.map(s => s.replace(/\r\n/g, '\n')).join('\n')).digest('hex').slice(0, 12);
for (const file of ['index.html', 'app.js', 'report.js']) {
  let content = await readFile(new URL(file, output), 'utf8');
  content = content.replace(/(src|href)="((?:app\.js|styles\.css))"/g, `$1="$2?v=${revision}"`);
  content = content.replace(/from '(\.\/[^']+\.js)'/g, `from '$1?v=${revision}'`);
  await writeFile(new URL(file, output), content);
}
console.log(`Built ${files.length} public assets in dist/`);
