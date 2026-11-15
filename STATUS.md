# SSCrypto status

Where the work stands, and what's next. The rules for working in this repo are in [CLAUDE.md](CLAUDE.md).

## What exists

- A signed JSON tree with delegated ownership (`Tree` v3), entities referenced by id and listed in `entities` on owned branches, a JSONPath-subset query language (`Query` v2), and `get`/`put` protocol messages handled in memory (`Protocol` v2).
- Every resource is a signed ES module with tests; `node node/test.js` runs all of them and CI runs it before deploying to GitHub Pages.
- `tree.json` (repo root) is the saved tree: root owned by `danperry`, a `documentation.protocol` section explaining the protocol in plain language, and starter dummy users and groups under `games` and `club`. `TreeStore` keeps it in localStorage, falling back to `tree.json`; `node/app.js` has a temporary `PUT /tree.json` endpoint.
- The root key is Dan's real key: public in `coreEntity.json`, private only on Dan's machine at `~/.sscrypto/core-key.json` (and in his browser's localStorage as `SSCrypto.coreKey`).

## Only Dan can do these

- **Signing.** Anything that changes a `resource.js` must be re-signed with `node node/sign.js`, which needs the private key on Dan's machine. Work done elsewhere (a cloud session) can write and test code locally, but the loader and CI reject unsigned resources, so Dan has to run `node node/sign.js` and push before it deploys.
- **Changing the root of `tree.json`.** Root changes are signed with the same key.

## Known gotcha

- Dan's browser keeps its own copy of the tree in localStorage and saves it back to `tree.json` on every page load. If `tree.json` is changed outside the browser (e.g. the docs were added that way), clear it first in the browser console with `localStorage.removeItem("SSCrypto.tree")`, or the old copy overwrites the file. Fix: next item below.

## Next steps

1. **TreeStore v2: keep the newest copy.** Load both localStorage and `tree.json` and keep the one with the higher root `seq`, so edits made outside the browser win. Then a baseApp version that uses it.
2. **Run the resources in Node** (for the server): move the test runner's browser stand-ins (`fetch` for files, `document.baseURI`, `localStorage`) into one shared Node file used by both the tests and the server, plus a disk-based store. Node 18 rejected the browser-exported key's `"alg": "Ed25519"` label; check whether Node 22 accepts it, or have Crypto drop the label.
3. **A client way to make changes:** edit a branch, sign it, and send it as a `put`.
4. **Then the server.** Decisions Dan still needs to make first:
   - Is the server the main store everyone syncs with, or one peer among many?
   - Transport and hosting: a single `POST /protocol` (JSON in, JSON out), maybe WebSocket for live updates; HTTPS and CORS if it's hosted anywhere but locally.
   - Are all reads public, or do some branches need signed requests and read permissions?
   - How peers catch up: "changes since seq X", or comparing `{"#": hash}` stubs.
5. **Before going public:** keep private keys out of plain localStorage (non-extractable keys in IndexedDB, or encrypted with a passphrase); add size, query-cost and rate limits; add a protocol version to messages (`{ v: 1, type, ... }`); retire `PUT /tree.json`.

## Later

- Sub-populations with different security levels, including multiple signatures (a Population has one key for now).
- Resources owned by entities other than the root (the loader only accepts the CoreEntity as owner today).
- Two different edits signed with the same `seq` (e.g. one key used on two devices).
- Remove the old `Cow`, `Pig` and baseApp v1–v2 test resources (v1–v2 try to load a `Pig` resource that doesn't exist).
