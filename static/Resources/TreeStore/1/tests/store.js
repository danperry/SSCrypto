// Each test gets the TreeStore version being tested: this one or a newer one.
import assert from "node:assert/strict";

// Runs fn with fetch swapped for a fake, then puts the real one back.
async function withFetch(fake, fn) {
	const real = globalThis.fetch;
	globalThis.fetch = fake;
	try {
		return await fn();
	} finally {
		globalThis.fetch = real;
	}
}

export default {
	"save puts the tree in localStorage and sends it to tree.json": async TreeStore => {
		const calls = [];
		const reached = await withFetch(async (url, options) => { calls.push({ url: String(url), options }); return { ok: true }; },
			() => TreeStore.save({ a: 1 }));
		assert.equal(reached, true);
		assert.deepEqual(JSON.parse(localStorage.getItem("SSCrypto.tree")), { a: 1 });
		assert.ok(calls[0].url.endsWith("/tree.json"));
		assert.equal(calls[0].options.method, "PUT");
		assert.deepEqual(JSON.parse(calls[0].options.body), { a: 1 });
	},

	"save still works when the disk can't be reached": async TreeStore => {
		const reached = await withFetch(async () => { throw new Error("offline"); }, () => TreeStore.save({ b: 2 }));
		assert.equal(reached, false);
		assert.deepEqual(JSON.parse(localStorage.getItem("SSCrypto.tree")), { b: 2 });
	},

	"load prefers localStorage": async TreeStore => {
		localStorage.setItem("SSCrypto.tree", JSON.stringify({ c: 3 }));
		const result = await withFetch(async () => ({ ok: true, json: async () => ({ other: true }) }), () => TreeStore.load());
		assert.deepEqual(result, { tree: { c: 3 }, from: "localStorage" });
	},

	"load uses tree.json when localStorage is empty": async TreeStore => {
		localStorage.removeItem("SSCrypto.tree");
		const result = await withFetch(async () => ({ ok: true, json: async () => ({ d: 4 }) }), () => TreeStore.load());
		assert.deepEqual(result, { tree: { d: 4 }, from: "disk" });
	},

	"load gives null when nothing is saved": async TreeStore => {
		localStorage.removeItem("SSCrypto.tree");
		const result = await withFetch(async () => ({ ok: false }), () => TreeStore.load());
		assert.deepEqual(result, { tree: null, from: null });
	}
};
