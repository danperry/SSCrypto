// Each test gets the Query version being tested: this one or a newer one.
import assert from "node:assert/strict";

const Tree = await Network.loadResource("Tree", 1);
const { User } = await Network.loadResource("Entity", 1);
const dan = await User.create("dan", "Dan");
const alice = await User.create("alice", "Alice");

const tree = { owner: dan.record(), seq: 0 };
await Tree.update(tree, ["list"], [{ a: 1 }, { a: 2, "odd key": 3 }], dan);
await Tree.update(tree, ["notes"], { hello: "world", secret: "shh" }, dan);
await Tree.delegate(tree, ["games"], alice, dan);
await Tree.update(tree, ["games", "deep"], { x: { a: 5 } }, alice);

export default {
	"parse": Query => {
		assert.deepEqual(Query.parse("$.a..b[0]['c d'][*].*"), [
			{ key: "a", deep: false }, { key: "b", deep: true }, { key: 0, deep: false },
			{ key: "c d", deep: false }, { key: "*", deep: false }, { key: "*", deep: false }
		]);
	},

	"bad queries throw": Query => {
		assert.throws(() => Query.parse("a.b"), /must start with \$/);
		assert.throws(() => Query.parse("$.a b"), /at " b"/);
	},

	"find with names, indexes and quoted names": Query => {
		assert.deepEqual(Query.find(tree, "$.list[1]['odd key']"), [["list", 1, "odd key"]]);
		assert.deepEqual(Query.find(tree, "$.notes.hello"), [["notes", "hello"]]);
		assert.deepEqual(Query.find(tree, "$.nothing"), []);
	},

	"find with * and ..": Query => {
		assert.equal(Query.find(tree, "$.list[*]").length, 2);
		assert.deepEqual(Query.find(tree, "$..a"), [["list", 0, "a"], ["list", 1, "a"], ["games", "deep", "x", "a"]]);
	},

	"run keeps the selection and stubs the rest": async Query => {
		const result = await Query.run(tree, { select: "$.notes" });
		assert.deepEqual(result.notes, { hello: "world", secret: "shh" });
		assert.ok(Tree.isStub(result.list) && Tree.isStub(result.games));
		assert.equal(await Tree.verify(result, dan.record()), true);
	},

	"run with omit hides parts but still verifies": async Query => {
		const result = await Query.run(tree, { select: "$.notes", omit: ["$..secret"] });
		assert.equal(result.notes.hello, "world");
		assert.ok(Tree.isStub(result.notes.secret));
		assert.equal(await Tree.verify(result, dan.record()), true);
	},

	"run starting deep inside a delegated branch verifies": async Query => {
		const result = await Query.run(tree, { select: "$..x" });
		assert.deepEqual(result.games.deep.x, { a: 5 });
		assert.equal(await Tree.verify(result, dan.record()), true);
	},

	"run on array items verifies": async Query => {
		const result = await Query.run(tree, { select: "$.list[1]", omit: ["$..['odd key']"] });
		assert.ok(Tree.isStub(result.list[0]));
		assert.equal(result.list[1].a, 2);
		assert.equal(await Tree.verify(result, dan.record()), true);
	},

	"run with no options returns the whole tree": async Query => {
		assert.deepEqual(await Query.run(tree), tree);
	}
};
