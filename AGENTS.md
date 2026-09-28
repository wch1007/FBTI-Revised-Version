# FBTI Revised Version

Work for this project belongs in this folder, `D:\personal website\FBTI`.

- Origin: `git@github.com:wch1007/FBTI-Revised-Version.git`.
- Upstream reference: `https://github.com/leishaforlinminzhi-9/FBTI.git`.
- Make changes in the wch1007 repository; do not push to upstream.
- Preserve RED / 红姐 attribution. Do not import upstream login records.
- Preserve RED's original 30 question stems, hints and terminology, with the user's approved option edits and additions. Do not rewrite it as a novice tutorial.
- Do not add explicit skill self-rating questions. Infer tentative ability from scene choices only. Preference, emotion, aspirations and willingness to dive are not ability evidence.
- User edits option text in `questions.json`; scoring lives separately in `scoring-map.json`, keyed by stable option IDs. Do not change an ID when only editing wording or reordering options. Revisit its mapping if the meaning changes.
- Reuse RED's original 18 personality PNGs in `image/fbti/` without cropping or changing them, including in exported reports.
- Keep personality preferences separate from ability evidence. Resting and choosing safe play must not count as low ability. The user's explicit rule is that inability to Layout caps the entire reported range at L6; willingness to dive alone does not affect ability or trigger a novice persona.
- Do not expose scoring clues, internal persona explanations or next-step training sections in the player report or exported image. Document the algorithm in README instead.
- Explain that L0–L9 and ±2 are an entertainment estimate, not an official assessment.
- The site uses local assets, no account system and no answer-upload endpoint.
- Run `npm test` and `npm run build` before deployment. Check both mobile and desktop layouts after UI changes.
- `main` deploys to `https://wch1007.github.io/FBTI-Revised-Version/` through GitHub Actions. The build publishes an explicit public-asset allowlist.
