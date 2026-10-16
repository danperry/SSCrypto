// Each test gets the baseApp version being tested: this one or a newer one.
import assert from "node:assert/strict";

const Tree = await Network.loadResource("Tree", 2);
const { User } = await Network.loadResource("Entity", 1);

// Runs baseApp with no tree.json on "disk", so a real tree.json in the repo doesn't get in the way.
async function runWithoutDisk(baseApp) {
	const real = globalThis.fetch;
	globalThis.fetch = (url, options) => String(url).endsWith("/tree.json") ? { ok: false } : real(url, options);
	try {
		await baseApp.run();
	} finally {
		globalThis.fetch = real;
	}
}

function savedTree() {
	return JSON.parse(localStorage.getItem("SSCrypto.tree"));
}

// The demo uses this browser's key as the root, which run() keeps in localStorage.
function root() {
	return new User(JSON.parse(localStorage.getItem("SSCrypto.coreKey"))).record();
}

export default {
	"a new saved tree has the current users at the root and dummies in owned branches": async baseApp => {
		localStorage.removeItem("SSCrypto.tree");
		await runWithoutDisk(baseApp);
		const tree = savedTree();
		assert.equal(tree.owner, "danperry");
		assert.deepEqual(Object.keys(tree.entities).sort(), ["alice", "club", "danperry"]);
		assert.equal(tree.games.owner, "alice");
		assert.deepEqual(Object.keys(tree.games.entities).sort(), ["bob", "carol", "gamers"]);
		assert.equal(tree.games.arcade.owner, "gamers");
		assert.equal(tree.club.owner, "club");
		assert.deepEqual(Object.keys(tree.club.entities).sort(), ["committee", "dave"]);
		assert.deepEqual(tree.club.meetings.members, ["alice", "dave"]);
		assert.equal(await Tree.verify(tree, root()), true);
	},

	"a saved tree from before entities lists is upgraded, keeping its notes": async baseApp => {
		const dan = new User(JSON.parse(localStorage.getItem("SSCrypto.coreKey")));
		const old = { owner: dan.record(), seq: 0 };
		await Tree.update(old, ["notes"], { created: "2026-01-01" }, dan);
		localStorage.setItem("SSCrypto.tree", JSON.stringify(old));
		await runWithoutDisk(baseApp);
		const tree = savedTree();
		assert.equal(tree.owner, "danperry");
		assert.deepEqual(tree.notes, { created: "2026-01-01" });
		assert.ok(tree.entities.alice);
		assert.equal(await Tree.verify(tree, root()), true);
		localStorage.removeItem("SSCrypto.tree");
	}
};
