# SSCrypto

## Rules

- Always run `git push` right after every `git commit` in this repo.
- Keep all code as simple and concise as possible, so even coding hobbyists can understand it. Prefer the plainest approach: few moving parts, few abstractions, no extra dependencies.

## Resources

Each folder in `static/Resources/` is a resource named by the folder (for example `Cow`, `baseApp`).

- Numbered subfolders (`1`, `2`, ...) are versions of that resource.
- Each version's `resource.js` is the JavaScript that runs when the resource loads. It must `return` an object, which is what `await Network.loadResource(id, version)` gives. It can `await`. Resources load their dependencies with exact versions.
- The first line of `resource.js` is `// signature: <base64>`: the owner's signature over `"<id>/<version>\n"` plus the rest of the file. The loader refuses unsigned or badly signed versions. Run `node node/sign.js` after changing any `resource.js` (the private key lives outside the repo, default `~/.sscrypto/core-key.json`).
- `info.json` has `owner` (the entity id that signs the versions; for now only the CoreEntity id in `coreEntity.json`), `current` (the version `Network.loadResource(id)` loads), `description`, and `versions`: for each version, `added` (each new property or function with its parameters, e.g. `"hash(text)"`, mapped to a description) and optional `notes`.
- Each version has a `tests/` folder of `.js` files. A test file is plain code using `resource` (the version under test), `test(name, fn)`, `assert` (Node's strict assert) and `Network`. Run `node node/test.js`; it also runs in CI before deploying.
- Versions are cached by the browser as if they never change, so add a new version instead of editing an old one (re-signing is the one exception).
- **Resources may only expand, so they stay backwards compatible.** A new version keeps every property and function of the previous version, with the same parameters and behavior, and only adds. It must pass the tests of every earlier version; `node/test.js` checks this.

## Tree

- `Tree` holds a signed JSON tree. Reserved property names: `owner` (an Entity record that owns that branch), `seq` (update counter), `signature`, and `{"#": hash}` (a left-out part).
- An owner signs its branch down to the next `owner` and no further. The root owner is `CoreEntity`.
- `Query` uses a subset of JSONPath: `Query.run(tree, { select, omit })`.
