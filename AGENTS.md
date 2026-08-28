# Better Esimson repository rules

These instructions apply to the entire repository.

## Version and changelog discipline

- Every user-visible code, style, asset, behavior, compatibility, packaging, or documentation change must increment the extension version in `manifest.json` in the same task.
- By default, increment the third SemVer component by one: `1.4.1` → `1.4.2`.
- Use a minor or major increment only when the user explicitly requests it or when the scope clearly warrants it and the user agrees.
- Add a matching section to `CHANGELOG.md` for every version increment. Never leave a versioned change undocumented.
- Use the current local date in `YYYY-MM-DD` format and group notes under `추가`, `변경`, `수정`, or `기타` as appropriate.
- Describe the user-visible outcome concisely. Include notable internal fixes when they explain reliability or compatibility improvements.
- Keep changelog sections in reverse chronological order, immediately below `다음 버전`.
- When a distributable archive exists under `.dist/`, update it after validation so its `manifest.json`, scripts, styles, assets, and changelog match the working tree.

## Verification

- After JavaScript changes, run `node --check content.js` and check any other changed JavaScript files the same way.
- After manifest changes, validate `manifest.json` as JSON.
- Run `git diff --check` before handing the work back.
- Do not claim browser-level visual verification unless it was actually performed.
