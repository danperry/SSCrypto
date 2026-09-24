// `resource` is the version being tested: this one or a newer one.
const { Entity, User, Population } = resource;

test("User.create makes a User with a key pair", async () => {
	const user = await User.create("alice", "Alice");
	assert.ok(user instanceof User && user instanceof Entity);
	assert.equal(user.type, "User");
	assert.equal(user.scheme, "Ed25519");
	assert.ok(user.publicKey && user.privateKey);
});

test("record() leaves out the private key", async () => {
	const record = (await User.create("alice", "Alice")).record();
	assert.deepEqual(Object.keys(record).sort(), ["id", "name", "publicKey", "scheme", "type"]);
});

test("sign and verify", async () => {
	const alice = await User.create("alice", "Alice");
	const bob = await User.create("bob", "Bob");
	const signature = await alice.sign("hi");
	assert.equal(await alice.verify("hi", signature), true);
	assert.equal(await bob.verify("hi", signature), false);
	assert.equal(await alice.verify("hi", undefined), false);
});

test("an entity without a private key can't sign", async () => {
	const record = (await User.create("alice", "Alice")).record();
	await assert.rejects(new User(record).sign("hi"));
});

test("unknown schemes don't verify", async () => {
	const entity = new Entity({ id: "x", type: "User", scheme: "Nope", publicKey: "" });
	assert.equal(await entity.verify("hi", "c2ln"), false);
});

test("Entity.from picks the class from type", async () => {
	const club = await Population.create("club", "Club");
	assert.equal(club.type, "Population");
	assert.ok(Entity.from(club.record()) instanceof Population);
	assert.ok(Entity.from({ type: "Unknown" }) instanceof Entity);
});
