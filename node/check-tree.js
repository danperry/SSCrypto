// Loads tree.json with the resources, in Node, and checks its signatures.
// A first step towards the server: the same resources as the browser, run in Node.
//
// Run: node node/check-tree.js
const browser = require('./browser');
browser({ saveToDisk: true });

async function main() {
  const Network = await browser.loadNetwork();
  const CoreEntity = await Network.loadResource('CoreEntity', 2);
  const Tree = await Network.loadResource('Tree', 3);
  const TreeStore = await Network.loadResource('TreeStore', 2);

  const { tree, from } = await TreeStore.load();
  if (!tree) return console.log('No tree.json found.');
  const ok = await Tree.verify(tree, CoreEntity);
  console.log(`tree.json (from ${from}, root seq ${tree.seq}) ${ok ? 'verifies' : 'does NOT verify'} against CoreEntity "${CoreEntity.id}".`);
  process.exit(ok ? 0 : 1);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
