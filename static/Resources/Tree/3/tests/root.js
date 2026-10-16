// Each test gets the Tree version being tested: this one or a newer one.
import assert from "node:assert/strict";

const { User } = await Network.loadResource("Entity", 1);
const dan = await User.create("dan", "Dan");
const alice = await User.create("alice", "Alice");

async function makeTree(Tree) {
	const tree = { owner: "dan", seq: 0, entities: { dan: dan.record() } };
	await Tree.delegate(tree, ["games"], alice, dan);
	await Tree.update(tree, ["games", "scores"], { alice: 10 }, alice);
	return tree;
}

export default {
	"the root's owner is looked up in the root's own list": async Tree => {
		const tree = await makeTree(Tree);
		assert.equal(await Tree.verifyBranch(tree), true);
		assert.equal(await Tree.verify(tree, dan.record()), true);
	},

	"the root's listed owner must still be core": async Tree => {
		// Eve makes a root that lists her own key under Dan's id.
		const eve = await User.create("dan", "Eve");
		const tree = { owner: "dan", seq: 0, entities: { dan: eve.record() } };
		await Tree.update(tree, ["notes"], "hi", eve);
		assert.equal(await Tree.verifyBranch(tree), true);
		assert.equal(await Tree.verify(tree, dan.record()), false);
	},

	"a root that doesn't list its owner uses core": async Tree => {
		const tree = { owner: "dan", seq: 0 };
		await Tree.sign(tree, dan);
		assert.equal(await Tree.verify(tree, dan.record()), true);
		assert.equal(await Tree.verifyBranch(tree), false);
	},

	"branches below the root still can't use their own list for their owner": async Tree => {
		const tree = await makeTree(Tree);
		const eve = await User.create("eve", "Eve");
		const branch = { owner: "eve", seq: 1, entities: { eve: eve.record() } };
		await Tree.sign(branch, eve);
		await Tree.update(tree, ["games", "eves"], branch, alice);
		assert.equal(await Tree.verify(tree, dan.record()), false);
	}
};
