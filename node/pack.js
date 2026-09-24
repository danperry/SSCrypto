// Copies each static/Resources/<name>/<version>/resource.js into the
// "contents" of the resource.json next to it.  Run: node node/pack.js
const fs = require('fs');
const path = require('path');

const resources = path.join(__dirname, '..', 'static', 'Resources');

for (const name of fs.readdirSync(resources)) {
  const folder = path.join(resources, name);
  if (!fs.statSync(folder).isDirectory()) continue;
  for (const version of fs.readdirSync(folder)) {
    const source = path.join(folder, version, 'resource.js');
    if (!fs.existsSync(source)) continue;
    const contents = fs.readFileSync(source, 'utf8');
    fs.writeFileSync(path.join(folder, version, 'resource.json'), JSON.stringify({ contents }, null, 2) + '\n');
    console.log(`packed ${name}/${version}`);
  }
}
