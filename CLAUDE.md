# SSCrypto

## Rules

- Always run `git push` right after every `git commit` in this repo.
- Keep all code as simple and concise as possible, so even coding hobbyists can understand it. Prefer the plainest approach: few moving parts, few abstractions, no extra dependencies.

## Resources

Each folder in `static/Resources/` is a resource named by the folder (for example `Cow`, `baseApp`).

- Numbered subfolders (`1`, `2`, ...) are versions of that resource.
- Each version's `resource.json` has a `contents` key holding the JavaScript that runs when the resource loads.
- `info.json` has a `current` key: the version number `Network.loadResource(id)` loads. `Network.loadResource(id, version)` loads a specific version.
- Versions are cached by the browser as if they never change, so add a new version instead of editing an old one.
- Write the code in `resource.js` next to `resource.json`, then run `node node/pack.js` to copy it into `contents`.
- A resource's code can `await` and `return` a value; `await Network.loadResource(id, version)` gives that value. Resources load their dependencies with exact versions.

## Tree

- `Tree` holds a signed JSON tree. Reserved property names: `owner` (an Entity record that owns that branch), `seq` (update counter), `signature`, and `{"#": hash}` (a left-out part).
- An owner signs its branch down to the next `owner` and no further. The root owner is `CoreEntity`.
- `Query` uses a subset of JSONPath: `Query.run(tree, { select, omit })`.
