// Tests every resource version. For each version it checks that:
//  - it loads (a module signed by its owner)
//  - it still has everything the previous version had (resources only expand)
//  - it has everything info.json says was added in it and earlier versions
//  - the tests in its own tests folder AND every earlier version's tests pass
//
// Run: node node/test.js
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..');
const resources = path.join(root, 'static', 'Resources');

// Just enough of a browser for the resources to run in Node.
globalThis.crypto = globalThis.crypto || require('crypto').webcrypto;
globalThis.fetch = async url => {
  const text = fs.readFileSync(new URL(url), 'utf8');
  return { text: async () => text, json: async () => JSON.parse(text) };
};
globalThis.alert = () => {};
globalThis.document = {
  baseURI: pathToFileURL(root + '/').href,
  createElement: () => ({ textContent: '' }),
  body: { children: [], append(child) { this.children.push(child); } }
};
process.on('unhandledRejection', error => console.log(`  (warning: ${error.message})`));

function versionsOf(id) {
  return fs.readdirSync(path.join(resources, id)).filter(name => /^\d+$/.test(name)).map(Number).sort((a, b) => a - b);
}

// Runs one test file against a resource. A test file is a module whose default
// export is { "test name": resource => { ... }, ... }.
async function runTestFile(file, resource) {
  const tests = (await import(pathToFileURL(file).href)).default;
  const failures = [];
  for (const [name, test] of Object.entries(tests)) {
    try {
      await test(resource);
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
    }
  }
  return { count: Object.keys(tests).length, failures };
}

async function main() {
  const Network = (await import(pathToFileURL(path.join(root, 'static', 'javascript', 'network.js')).href)).default;
  let failed = 0;
  const fail = message => { failed++; console.log(`  FAIL ${message}`); };

  for (const id of fs.readdirSync(resources).sort()) {
    const infoFile = path.join(resources, id, 'info.json');
    if (!fs.existsSync(infoFile)) continue;
    const info = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
    const versions = versionsOf(id);
    let previous = null;

    for (const version of versions) {
      console.log(`${id} v${version}`);
      let resource;
      try {
        resource = await Network.loadResource(id, version);
      } catch (error) {
        fail(error.message);
        continue;
      }

      if (previous) {
        for (const name of Object.keys(previous)) {
          if (!(name in resource)) fail(`"${name}" from an earlier version is missing`);
        }
      }

      for (const earlier of versions.filter(v => v <= version)) {
        const added = (info.versions?.[earlier]?.added) || {};
        for (const name of Object.keys(added)) {
          if (!(name.split('(')[0] in resource)) fail(`"${name}" (added in v${earlier} per info.json) is missing`);
        }

        const testsFolder = path.join(resources, id, String(earlier), 'tests');
        if (!fs.existsSync(testsFolder)) {
          fail(`v${earlier} has no tests folder`);
          continue;
        }
        for (const name of fs.readdirSync(testsFolder).filter(name => name.endsWith('.js')).sort()) {
          try {
            const { count, failures } = await runTestFile(path.join(testsFolder, name), resource);
            failures.forEach(message => fail(`v${earlier} tests/${name}: ${message}`));
            console.log(`  v${earlier} tests/${name}: ${count - failures.length}/${count} passed`);
          } catch (error) {
            fail(`v${earlier} tests/${name} didn't run: ${error.message}`);
          }
        }
      }
      previous = resource;
    }
  }

  console.log(failed ? `\n${failed} failure(s)` : '\nAll tests passed');
  process.exit(failed ? 1 : 0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
