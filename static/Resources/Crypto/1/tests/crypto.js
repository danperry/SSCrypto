// Each test gets the Crypto version being tested: this one or a newer one.
import assert from "node:assert/strict";

export default {
	"canonical sorts object keys at every level and keeps array order": Crypto => {
		assert.equal(Crypto.canonical({ b: 1, a: { d: [3, 1], c: "x" } }), '{"a":{"c":"x","d":[3,1]},"b":1}');
	},

	"hash gives the same base64 SHA-256 for the same text": async Crypto => {
		const a = await Crypto.hash("hello");
		assert.equal(a, "LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=");
		assert.notEqual(a, await Crypto.hash("hello!"));
	},

	"base64 round trips bytes": Crypto => {
		const bytes = new Uint8Array([0, 1, 250, 255]);
		assert.deepEqual([...Crypto.fromBase64(Crypto.toBase64(bytes))], [...bytes]);
	},

	"Ed25519 signs and verifies": async Crypto => {
		const ed = Crypto.schemes.Ed25519;
		const keys = await ed.generate();
		const signature = await ed.sign(keys.privateKey, "message");
		assert.equal(await ed.verify(keys.publicKey, "message", signature), true);
		assert.equal(await ed.verify(keys.publicKey, "other message", signature), false);
	}
};
