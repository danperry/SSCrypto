// Signs every static/Resources/<id>/<version>/resource.js with the root owner's key,
// by writing "// signature: <base64>" as the first line. Files already signed
// correctly are left alone.
//
// Run: node node/sign.js [private key file]
// The key file (default ~/.sscrypto/core-key.json) holds the private key as JWK,
// or a saved User with a "privateKey" property. Keep it out of this repo.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const resources = path.join(root, 'static', 'Resources');
const keyFile = process.argv[2] || path.join(os.homedir(), '.sscrypto', 'core-key.json');

const saved = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
const privateKey = crypto.createPrivateKey({ key: saved.privateKey || saved, format: 'jwk' });
const publicKey = crypto.createPublicKey(privateKey);

// Make sure this key is the one coreEntity.json says owns the root.
const core = JSON.parse(fs.readFileSync(path.join(root, 'coreEntity.json'), 'utf8'));
const publicBase64 = Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url').toString('base64');
if (publicBase64 !== core.publicKey) {
  console.error(`This key's public key is ${publicBase64}, but coreEntity.json has ${core.publicKey}.`);
  process.exit(1);
}

for (const id of fs.readdirSync(resources)) {
  const infoFile = path.join(resources, id, 'info.json');
  if (!fs.existsSync(infoFile)) continue;
  if (JSON.parse(fs.readFileSync(infoFile, 'utf8')).owner !== core.id) continue;

  for (const version of fs.readdirSync(path.join(resources, id))) {
    const file = path.join(resources, id, version, 'resource.js');
    if (!fs.existsSync(file)) continue;

    let text = fs.readFileSync(file, 'utf8');
    let oldSignature = '';
    if (text.startsWith('// signature: ')) {
      oldSignature = text.slice('// signature: '.length, text.indexOf('\n'));
      text = text.slice(text.indexOf('\n') + 1);
    }
    const message = Buffer.from(`${id}/${version}\n` + text);
    if (oldSignature && crypto.verify(null, message, publicKey, Buffer.from(oldSignature, 'base64'))) continue;

    const signature = crypto.sign(null, message, privateKey).toString('base64');
    fs.writeFileSync(file, `// signature: ${signature}\n` + text);
    console.log(`signed ${id}/${version}`);
  }
}
