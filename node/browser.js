// Just enough of a browser for the resources to run in Node. Used by the tests
// (node/test.js) and Node scripts that use the resources (node/check-tree.js;
// later the server).
//
//   require('./browser')({ saveToDisk: false })
//
// - fetch reads files from the repo, like the local server would. A missing file
//   answers "not found". A PUT writes the file only if saveToDisk is true (the tests
//   never write to disk); otherwise it answers "not ok", like a server that can't save.
// - localStorage is kept in memory, so TreeStore always falls back to tree.json.
// - document has a baseURI (the repo root) and a body the demo can write into.
const fs = require('fs');
const path = require('path');
const { pathToFileURL, fileURLToPath } = require('url');

const root = path.join(__dirname, '..');

module.exports = function setUp({ saveToDisk = false } = {}) {
  globalThis.crypto = globalThis.crypto || require('crypto').webcrypto;

  globalThis.fetch = async (url, options = {}) => {
    const file = fileURLToPath(new URL(url));
    if (options.method === 'PUT') {
      if (saveToDisk) fs.writeFileSync(file, options.body);
      return { ok: saveToDisk };
    }
    if (!fs.existsSync(file)) {
      const notFound = async () => { throw new Error(`Not found: ${file}`); };
      return { ok: false, text: notFound, json: notFound };
    }
    const text = fs.readFileSync(file, 'utf8');
    return { ok: true, text: async () => text, json: async () => JSON.parse(text) };
  };

  const storage = {};
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => (key in storage ? storage[key] : null),
    setItem: (key, value) => { storage[key] = String(value); },
    removeItem: key => { delete storage[key]; }
  } });

  globalThis.alert = () => {};
  globalThis.document = {
    baseURI: pathToFileURL(root + '/').href,
    createElement: () => ({ textContent: '' }),
    body: { children: [], append(child) { this.children.push(child); } }
  };
};

// Loads the resource loader and returns Network (also a global, as in the browser).
module.exports.loadNetwork = async function () {
  return (await import(pathToFileURL(path.join(root, 'static', 'javascript', 'network.js')).href)).default;
};
