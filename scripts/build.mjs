import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { validateQuestions } from '../scoring.js';
validateQuestions(JSON.parse(await readFile(new URL('../questions.json', import.meta.url), 'utf8')));
const output = new URL('../dist/', import.meta.url);
await mkdir(output, { recursive: true });
// Publish only public site assets: no tooling, local state or upstream login data.
const files = ['index.html', 'styles.css', 'app.js', 'scoring.js', 'report.js', 'questions.json', 'results.json', 'icon.svg', '.nojekyll', 'standalone.html'];
for (const file of files) await copyFile(new URL('../' + file, import.meta.url), new URL(file, output));
console.log(`Built ${files.length} public assets in dist/`);
