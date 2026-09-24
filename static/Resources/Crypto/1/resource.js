// signature: RLHv+TRDqBVpQvgUfCI4XlV1fmxlc+wbYEfMCshq7sSNw0FFB8QiNlicw1ZJkp4S/JnqCssPl/LQAbwNpj+SAQ==
// Crypto: JSON in one exact text form, SHA-256 hashing, and signing schemes.

// JSON with object keys sorted, so the same data always gives the same text.
export function canonical(value) {
	if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
	if (value && typeof value === "object") {
		return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
	}
	return JSON.stringify(value);
}

export function toBase64(bytes) {
	return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

export function fromBase64(text) {
	return Uint8Array.from(atob(text), letter => letter.charCodeAt(0));
}

// SHA-256 of a piece of text, as base64.
export async function hash(text) {
	return toBase64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

// Every scheme has the same three functions. Keys and signatures are
// JSON-friendly (base64 text or plain objects) so they can live in the tree.
export const schemes = {
	Ed25519: {
		async generate() {
			const keys = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
			return {
				publicKey: toBase64(await crypto.subtle.exportKey("raw", keys.publicKey)),
				privateKey: await crypto.subtle.exportKey("jwk", keys.privateKey)
			};
		},
		async sign(privateKey, text) {
			const key = await crypto.subtle.importKey("jwk", privateKey, { name: "Ed25519" }, false, ["sign"]);
			return toBase64(await crypto.subtle.sign("Ed25519", key, new TextEncoder().encode(text)));
		},
		async verify(publicKey, text, signature) {
			const key = await crypto.subtle.importKey("raw", fromBase64(publicKey), { name: "Ed25519" }, false, ["verify"]);
			return crypto.subtle.verify("Ed25519", key, fromBase64(signature), new TextEncoder().encode(text));
		}
	}
};
