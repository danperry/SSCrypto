// `resource` is the version being tested: this one or a newer one.
const Tree = resource;
const { User } = await Network.loadResource("Entity", 1);
const dan = await User.create("dan", "Dan");
const alice = await User.create("alice", "Alice");

// A root owned by Dan, with "games" delegated to Alice.
async function makeTree() {
	const tree = { owner: dan.record(), seq: 0 };
	await Tree.update(tree, ["notes"], { hello: "world" }, dan);
	await Tree.delegate(tree, ["games"], alice, dan);
	await Tree.update(tree, ["games", "scores"], { alice: 10 }, alice);
	return tree;
}

test("a signed tree verifies", async () => {
	assert.equal(await Tree.verify(await makeTree(), dan.record()), true);
});

test("changing any value breaks verification", async () => {
	const tree = await makeTree();
	tree.notes.hello = "changed";
	assert.equal(await Tree.verify(tree, dan.record()), false);
	const tree2 = await makeTree();
	tree2.games.scores.alice = 99;
	assert.equal(await Tree.verify(tree2, dan.record()), false);
});

test("the root must be owned by core", async () => {
	assert.equal(await Tree.verify(await makeTree(), alice.record()), false);
});

test("update bumps seq", async () => {
	const tree = await makeTree();
	const seq = tree.seq;
	await Tree.update(tree, ["notes", "hello"], "there", dan);
	assert.equal(tree.seq, seq + 1);
	assert.equal(Tree.get(tree, ["notes", "hello"]), "there");
});

test("update with undefined deletes", async () => {
	const tree = await makeTree();
	await Tree.update(tree, ["notes"], undefined, dan);
	assert.equal("notes" in tree, false);
	assert.equal(await Tree.verify(tree, dan.record()), true);
});

test("only the nearest owner can update", async () => {
	const tree = await makeTree();
	await assert.rejects(Tree.update(tree, ["games", "scores"], {}, dan), /doesn't own/);
	await assert.rejects(Tree.update(tree, ["notes"], {}, alice), /doesn't own/);
});

test("owner, seq and signature can't be set with update", async () => {
	const tree = await makeTree();
	await assert.rejects(Tree.update(tree, ["games", "owner"], dan.record(), alice), /use delegate/);
});

test("the parent's signature only covers a delegated branch's owner block", async () => {
	const tree = await makeTree();
	const rootSignature = tree.signature;
	await Tree.update(tree, ["games", "scores"], { alice: 20 }, alice);
	assert.equal(tree.signature, rootSignature);
	assert.equal(await Tree.verify(tree, dan.record()), true);
});

test("re-delegating takes a branch back", async () => {
	const tree = await makeTree();
	const bob = await User.create("bob", "Bob");
	await Tree.delegate(tree, ["games"], bob, dan);
	assert.equal(await Tree.verify(tree, dan.record()), false);
	await Tree.sign(tree.games, bob);
	assert.equal(await Tree.verify(tree, dan.record()), true);
	await assert.rejects(Tree.update(tree, ["games", "scores"], {}, alice), /doesn't own/);
});

test("a stub stands in for the part it replaces", async () => {
	const tree = await makeTree();
	tree.notes = { "#": await Tree.hash(tree.notes) };
	tree.games = { "#": await Tree.hash(tree.games) };
	assert.equal(await Tree.verify(tree, dan.record()), true);
});

test("get follows a path", async () => {
	const tree = await makeTree();
	assert.equal(Tree.get(tree, ["games", "scores", "alice"]), 10);
	assert.equal(Tree.get(tree, ["missing", "x"]), undefined);
});
