// Each test gets the TreeStore version being tested: this one or a newer one.
import assert from "node:assert/strict";

// Runs TreeStore.load with this localStorage copy and this tree.json (null for none).
async function loadWith(TreeStore, local, disk) {
	if (local) localStorage.setItem("SSCrypto.tree", JSON.stringify(local));
	else localStorage.removeItem("SSCrypto.tree");
	const real = globalThis.fetch;
	globalThis.fetch = async () => disk ? { ok: true, json: async () => disk } : { ok: false };
	try {
		return await TreeStore.load();
	} finally {
		globalThis.fetch = real;
	}
}

export default {
	"load keeps tree.json when its root seq is higher": async TreeStore => {
		const result = await loadWith(TreeStore, { seq: 3 }, { seq: 4 });
		assert.deepEqual(result, { tree: { seq: 4 }, from: "disk" });
	},

	"load keeps localStorage when its root seq is higher": async TreeStore => {
		const result = await loadWith(TreeStore, { seq: 5 }, { seq: 4 });
		assert.deepEqual(result, { tree: { seq: 5 }, from: "localStorage" });
	},

	"load keeps localStorage when the seqs are equal": async TreeStore => {
		const result = await loadWith(TreeStore, { seq: 4, a: 1 }, { seq: 4, b: 2 });
		assert.deepEqual(result, { tree: { seq: 4, a: 1 }, from: "localStorage" });
	},

	"load uses localStorage when tree.json is missing": async TreeStore => {
		const result = await loadWith(TreeStore, { seq: 1 }, null);
		assert.deepEqual(result, { tree: { seq: 1 }, from: "localStorage" });
	}
};
