// Each resource version only runs once; later loads get the same result.
const loaded = {};
let core;

export default class Network {
	// Runs a resource and returns the object its code returns.
	static async loadResource(id, version){
		const folder = new URL(`../Resources/${id}/`, import.meta.url);
		try {
			const info = await (await fetch(new URL("info.json", folder), { cache: "no-cache" })).json();
			version = version || info.current;
			const key = `${id}/${version}`;
			if (!loaded[key]) loaded[key] = run(id, version, info.owner, new URL(`${version}/resource.js`, folder));
			return await loaded[key];
		} catch (error) {
			throw new Error(`Failed to load resource "${id}": ${error.message}`);
		}
	}
}

async function run(id, version, owner, url){
	let text = await (await fetch(url, { cache: "force-cache" })).text();
	if (!await signedBy(owner, id, version, text)) {
		// The owner may have re-signed since this copy was cached, so try a fresh copy once.
		text = await (await fetch(url, { cache: "reload" })).text();
		if (!await signedBy(owner, id, version, text)) throw new Error(`Version ${version} isn't signed by "${owner}"`);
	}
	const code = "export default async function (Network) {\n" + text + "\n}";
	const module = await import("data:text/javascript," + encodeURIComponent(code));
	const result = await module.default(Network);
	if (result === null || typeof result !== "object") throw new Error(`Version ${version} didn't return an object`);
	return result;
}

// The first line of a resource.js is "// signature: <base64>": the owner's Ed25519
// signature over "<id>/<version>\n" plus the rest of the file.
async function signedBy(owner, id, version, text){
	const firstLine = text.slice(0, text.indexOf("\n"));
	if (!firstLine.startsWith("// signature: ")) return false;
	const signature = fromBase64(firstLine.slice("// signature: ".length).trim());
	const message = new TextEncoder().encode(`${id}/${version}\n` + text.slice(firstLine.length + 1));

	// For now only the root owner (CoreEntity) can own resources. Later, owners will come from the tree.
	core = core || fetch(new URL("../../coreEntity.json", import.meta.url), { cache: "no-cache" }).then(response => response.json());
	const { id: coreId, publicKey } = await core;
	if (owner !== coreId) throw new Error(`Unknown owner "${owner}"`);
	const key = await crypto.subtle.importKey("raw", fromBase64(publicKey), { name: "Ed25519" }, false, ["verify"]);
	return crypto.subtle.verify("Ed25519", key, signature, message);
}

function fromBase64(text){
	return Uint8Array.from(atob(text), letter => letter.charCodeAt(0));
}
