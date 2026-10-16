// Each test gets the Query version being tested: this one or a newer one.
import assert from "node:assert/strict";

const Tree = await Network.loadResource("Tree", 2);
const { User, Population } = await Network.loadResource("Entity", 1);
const dan = await User.create("dan", "Dan");
const alice = await User.create("alice", "Alice");
const team = await Population.create("team", "Team");

const tree = { owner: "dan", seq: 0, entities: { dan: dan.record() } };
await Tree.update(tree, ["notes"], { hello: "world" }, dan);
await Tree.delegate(tree, ["games"], alice, dan);
await Tree.delegate(tree, ["games", "arcade"], team, alice);
await Tree.update(tree, ["games", "arcade", "members"], ["alice"], team);

export default {
	"results keep the entities lists above the selection, so they verify": async Query => {
		const result = await Query.run(tree, { select: "$..members" });
		assert.deepEqual(result.entities, tree.entities);
		assert.deepEqual(result.games.entities, tree.games.entities);
		assert.ok(Tree.isStub(result.notes));
		assert.equal(await Tree.verify(result, dan.record()), true);
	}
};
