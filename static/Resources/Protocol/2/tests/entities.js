// Each test gets the Protocol version being tested: this one or a newer one.
import assert from "node:assert/strict";

const Tree = await Network.loadResource("Tree", 2);
const { User, Population } = await Network.loadResource("Entity", 1);
const dan = await User.create("dan", "Dan");
const alice = await User.create("alice", "Alice");
const team = await Population.create("team", "Team");

async function makeTree() {
	const tree = { owner: "dan", seq: 0, entities: { dan: dan.record() } };
	await Tree.delegate(tree, ["games"], alice, dan);
	await Tree.delegate(tree, ["games", "arcade"], team, alice);
	await Tree.update(tree, ["games", "arcade", "members"], ["alice"], team);
	return tree;
}

export default {
	"put accepts a newer branch whose owner is listed higher up": async Protocol => {
		const ours = await makeTree();
		const theirs = structuredClone(ours);
		await Tree.update(theirs, ["games", "arcade", "members"], ["alice", "dan"], team);
		const reply = await Protocol.handle(ours, { type: "put", path: ["games", "arcade"], branch: theirs.games.arcade });
		assert.deepEqual(reply, { type: "ok" });
		assert.deepEqual(ours.games.arcade.members, ["alice", "dan"]);
		assert.equal(await Tree.verify(ours, dan.record()), true);
	},

	"put turns down a branch signed by someone else with the same id": async Protocol => {
		const ours = await makeTree();
		const fakeTeam = await Population.create("team", "Fake");
		const branch = { owner: "team", seq: 9, members: [] };
		await Tree.sign(branch, fakeTeam);
		assert.match((await Protocol.handle(ours, { type: "put", path: ["games", "arcade"], branch })).message, /Bad signature/);
	}
};
