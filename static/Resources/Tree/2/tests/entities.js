// Each test gets the Tree version being tested: this one or a newer one.
import assert from "node:assert/strict";

const { User, Population } = await Network.loadResource("Entity", 1);
const dan = await User.create("dan", "Dan");
const alice = await User.create("alice", "Alice");
const bob = await User.create("bob", "Bob");
const team = await Population.create("team", "Team");

// Dan's root lists himself; "games" goes to Alice, who gives "arcade" to her team.
async function makeTree(Tree) {
	const tree = { owner: "dan", seq: 0, entities: { dan: dan.record() } };
	await Tree.delegate(tree, ["games"], alice, dan);
	await Tree.addEntity(tree, ["games"], bob, alice);
	await Tree.delegate(tree, ["games", "arcade"], team, alice);
	await Tree.update(tree, ["games", "arcade", "members"], ["alice", "bob"], team);
	return tree;
}

export default {
	"owners are stored as ids, with records in the delegator's entities list": async Tree => {
		const tree = await makeTree(Tree);
		assert.equal(tree.owner, "dan");
		assert.equal(tree.games.owner, "alice");
		assert.deepEqual(tree.entities.alice, alice.record());
		assert.equal(tree.games.arcade.owner, "team");
		assert.deepEqual(tree.games.entities.team, team.record());
		assert.deepEqual(tree.games.entities.bob, bob.record());
		assert.equal(await Tree.verify(tree, dan.record()), true);
	},

	"lower branches can use entities listed higher up": async Tree => {
		const tree = await makeTree(Tree);
		await Tree.delegate(tree, ["games", "arcade", "alicesCorner"], alice, team);
		assert.equal("entities" in tree.games.arcade, false);
		await Tree.update(tree, ["games", "arcade", "alicesCorner", "note"], "hi", alice);
		assert.equal(await Tree.verify(tree, dan.record()), true);
	},

	"a branch's own list doesn't count for its own owner": async Tree => {
		const tree = await makeTree(Tree);
		const eve = await User.create("eve", "Eve");
		const branch = { owner: "eve", seq: 1, entities: { eve: eve.record() } };
		await Tree.sign(branch, eve);
		tree.games.eves = branch;
		await Tree.sign(tree.games, alice);
		assert.equal(await Tree.verify(tree, dan.record()), false);
	},

	"an unknown owner id doesn't verify": async Tree => {
		const tree = await makeTree(Tree);
		tree.games.arcade.owner = "nobody";
		await Tree.sign(tree.games, alice);
		assert.equal(await Tree.verify(tree, dan.record()), false);
	},

	"changing an entity record breaks the signature of the branch that lists it": async Tree => {
		const tree = await makeTree(Tree);
		tree.games.entities.bob.publicKey = alice.publicKey;
		assert.equal(await Tree.verify(tree, dan.record()), false);
	},

	"the nearest list wins when an id is listed twice": async Tree => {
		const tree = await makeTree(Tree);
		const otherBob = await User.create("bob", "Another Bob");
		await Tree.addEntity(tree, [], otherBob, dan);
		assert.equal(Tree.findEntity(tree, ["games", "x"], "bob").publicKey, bob.publicKey);
		assert.equal(Tree.findEntity(tree, ["x"], "bob").publicKey, otherBob.publicKey);
	},

	"delegate won't swap in a different entity with a known id": async Tree => {
		const tree = await makeTree(Tree);
		const fakeAlice = await User.create("alice", "Fake");
		await assert.rejects(Tree.delegate(tree, ["more"], fakeAlice, dan), /different "alice"/);
	},

	"only a branch's owner can add to its entities list": async Tree => {
		const tree = await makeTree(Tree);
		await assert.rejects(Tree.addEntity(tree, ["games"], dan, bob), /doesn't own/);
		await assert.rejects(Tree.addEntity(tree, ["nothing"], bob, dan), /No owned branch/);
	},

	"entityLists gives the lists a node at path can use, nearest last": async Tree => {
		const tree = await makeTree(Tree);
		assert.equal(Tree.entityLists(tree, ["games", "arcade", "x"]).length, 3);
		assert.deepEqual(Object.keys(Tree.entityLists(tree, ["games"])[0]).sort(), ["alice", "dan"]);
	}
};
