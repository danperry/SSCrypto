// `resource` is the version being tested: this one or a newer one.
const Protocol = resource;
const Tree = await Network.loadResource("Tree", 1);
const { User } = await Network.loadResource("Entity", 1);
const dan = await User.create("dan", "Dan");
const alice = await User.create("alice", "Alice");
const bob = await User.create("bob", "Bob");

async function makeTree() {
	const tree = { owner: dan.record(), seq: 0 };
	await Tree.update(tree, ["notes"], { hello: "world" }, dan);
	await Tree.delegate(tree, ["games"], alice, dan);
	await Tree.update(tree, ["games", "scores"], { alice: 10 }, alice);
	return tree;
}

test("get answers with a query result", async () => {
	const reply = await Protocol.handle(await makeTree(), { type: "get", query: { select: "$.notes" } });
	assert.equal(reply.type, "result");
	assert.equal(reply.tree.notes.hello, "world");
});

test("unknown messages get an error", async () => {
	const reply = await Protocol.handle(await makeTree(), { type: "dance" });
	assert.equal(reply.type, "error");
});

test("put accepts a newer branch, once", async () => {
	const ours = await makeTree();
	const theirs = structuredClone(ours);
	await Tree.update(theirs, ["games", "scores"], { alice: 11 }, alice);
	const put = { type: "put", path: ["games"], branch: theirs.games };
	assert.deepEqual(await Protocol.handle(ours, put), { type: "ok" });
	assert.equal(ours.games.scores.alice, 11);
	assert.equal(await Tree.verify(ours, dan.record()), true);
	assert.match((await Protocol.handle(ours, put)).message, /Not newer/);
});

test("put turns down a different owner", async () => {
	const ours = await makeTree();
	const forged = { owner: bob.record(), seq: 5 };
	await Tree.sign(forged, bob);
	assert.match((await Protocol.handle(ours, { type: "put", path: ["games"], branch: forged })).message, /Owner doesn't match/);
});

test("put turns down a bad signature", async () => {
	const ours = await makeTree();
	const branch = structuredClone(ours.games);
	branch.seq = 50;
	assert.match((await Protocol.handle(ours, { type: "put", path: ["games"], branch })).message, /Bad signature/);
});

test("put keeps our newer copy of a delegated branch", async () => {
	const ours = await makeTree();
	const theirs = structuredClone(ours);
	await Tree.update(ours, ["games", "scores"], { alice: 30 }, alice);
	await Tree.update(theirs, ["notes"], { hello: "again" }, dan);
	assert.deepEqual(await Protocol.handle(ours, { type: "put", path: [], branch: theirs }), { type: "ok" });
	assert.equal(ours.notes.hello, "again");
	assert.equal(ours.games.scores.alice, 30);
	assert.equal(await Tree.verify(ours, dan.record()), true);
});
