// Each test gets the Tree version being tested: this one or a newer one.
import assert from "node:assert/strict";

const { User } = await Network.loadResource("Entity", 1);
const dan = await User.create("dan", "Dan");
const alice = await User.create("alice", "Alice");

// A root owned by Dan, with "games" delegated to Alice.
async function makeTree(Tree) {
	const tree = { owner: dan.record(), seq: 0 };
	await Tree.update(tree, ["notes"], { hello: "world" }, dan);
	await Tree.delegate(tree, ["games"], alice, dan);
	await Tree.update(tree, ["games", "scores"], { alice: 10 }, alice);
	return tree;
}

export default {
	"a signed tree verifies": async Tree => {
		assert.equal(await Tree.verify(await makeTree(Tree), dan.record()), true);
	},

	"changing any value breaks verification": async Tree => {
		const tree = await makeTree(Tree);
		tree.notes.hello = "changed";
		assert.equal(await Tree.verify(tree, dan.record()), false);
		const tree2 = await makeTree(Tree);
		tree2.games.scores.alice = 99;
		assert.equal(await Tree.verify(tree2, dan.record()), false);
	},

	"the root must be owned by core": async Tree => {
		assert.equal(await Tree.verify(await makeTree(Tree), alice.record()), false);
	},

	"update bumps seq": async Tree => {
		const tree = await makeTree(Tree);
		const seq = tree.seq;
		await Tree.update(tree, ["notes", "hello"], "there", dan);
		assert.equal(tree.seq, seq + 1);
		assert.equal(Tree.get(tree, ["notes", "hello"]), "there");
	},

	"update with undefined deletes": async Tree => {
		const tree = await makeTree(Tree);
		await Tree.update(tree, ["notes"], undefined, dan);
		assert.equal("notes" in tree, false);
		assert.equal(await Tree.verify(tree, dan.record()), true);
	},

	"only the nearest owner can update": async Tree => {
		const tree = await makeTree(Tree);
		await assert.rejects(Tree.update(tree, ["games", "scores"], {}, dan), /doesn't own/);
		await assert.rejects(Tree.update(tree, ["notes"], {}, alice), /doesn't own/);
	},

	"owner, seq and signature can't be set with update": async Tree => {
		const tree = await makeTree(Tree);
		await assert.rejects(Tree.update(tree, ["games", "owner"], dan.record(), alice), /use delegate/);
	},

	"the parent's signature only covers a delegated branch's owner block": async Tree => {
		const tree = await makeTree(Tree);
		const rootSignature = tree.signature;
		await Tree.update(tree, ["games", "scores"], { alice: 20 }, alice);
		assert.equal(tree.signature, rootSignature);
		assert.equal(await Tree.verify(tree, dan.record()), true);
	},

	"re-delegating takes a branch back": async Tree => {
		const tree = await makeTree(Tree);
		const bob = await User.create("bob", "Bob");
		await Tree.delegate(tree, ["games"], bob, dan);
		assert.equal(await Tree.verify(tree, dan.record()), false);
		await Tree.sign(tree.games, bob);
		assert.equal(await Tree.verify(tree, dan.record()), true);
		await assert.rejects(Tree.update(tree, ["games", "scores"], {}, alice), /doesn't own/);
	},

	"a stub stands in for the part it replaces": async Tree => {
		const tree = await makeTree(Tree);
		tree.notes = { "#": await Tree.hash(tree.notes) };
		tree.games = { "#": await Tree.hash(tree.games) };
		assert.equal(await Tree.verify(tree, dan.record()), true);
	},

	"get follows a path": async Tree => {
		const tree = await makeTree(Tree);
		assert.equal(Tree.get(tree, ["games", "scores", "alice"]), 10);
		assert.equal(Tree.get(tree, ["missing", "x"]), undefined);
	}
};
