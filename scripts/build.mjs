import { mkdir, copyFile, readFile } from 'node:fs/promises';
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
console.log(`Built ${files.length} public assets in dist/`);
