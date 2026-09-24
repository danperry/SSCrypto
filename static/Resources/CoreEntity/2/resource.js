// CoreEntity: the owner of the root of the tree. Every signature check traces back to this key.
// The public key is read from coreEntity.json next to index.html, so it can be changed without a new version.
const file = await (await fetch(new URL("coreEntity.json", document.baseURI), { cache: "no-cache" })).json();

return {
	id: "danperry",
	type: "User",
	name: "Dan Perry",
	scheme: "Ed25519",
	publicKey: file.publicKey
};
