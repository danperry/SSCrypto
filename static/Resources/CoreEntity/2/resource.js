// signature: 8tKiqH3Ham4+ipiyUGimTFgRnvxTU/D1MN3w30bFKRtmMk4TzBEyK+42d2XeS1he6MO0SqZGGAgqc6yeszepDw==
// CoreEntity: the owner of the root of the tree. Every signature check traces back to this key.
// The public key is read from coreEntity.json next to index.html, so it can be changed without a new version.
const file = await (await fetch(new URL("coreEntity.json", document.baseURI), { cache: "no-cache" })).json();

export const id = "danperry";
export const type = "User";
export const name = "Dan Perry";
export const scheme = "Ed25519";
export const publicKey = file.publicKey;
