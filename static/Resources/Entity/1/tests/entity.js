// Each test gets the Entity version being tested: this one or a newer one.
import assert from "node:assert/strict";

export default {
	"User.create makes a User with a key pair": async ({ Entity, User }) => {
		const user = await User.create("alice", "Alice");
		assert.ok(user instanceof User && user instanceof Entity);
		assert.equal(user.type, "User");
		assert.equal(user.scheme, "Ed25519");
		assert.ok(user.publicKey && user.privateKey);
	},

	"record() leaves out the private key": async ({ User }) => {
		const record = (await User.create("alice", "Alice")).record();
		assert.deepEqual(Object.keys(record).sort(), ["id", "name", "publicKey", "scheme", "type"]);
	},

	"sign and verify": async ({ User }) => {
		const alice = await User.create("alice", "Alice");
		const bob = await User.create("bob", "Bob");
		const signature = await alice.sign("hi");
		assert.equal(await alice.verify("hi", signature), true);
		assert.equal(await bob.verify("hi", signature), false);
		assert.equal(await alice.verify("hi", undefined), false);
	},

	"an entity without a private key can't sign": async ({ User }) => {
		const record = (await User.create("alice", "Alice")).record();
		await assert.rejects(new User(record).sign("hi"));
	},

	"unknown schemes don't verify": async ({ Entity }) => {
		const entity = new Entity({ id: "x", type: "User", scheme: "Nope", publicKey: "" });
		assert.equal(await entity.verify("hi", "c2ln"), false);
	},

	"Entity.from picks the class from type": async ({ Entity, Population }) => {
		const club = await Population.create("club", "Club");
		assert.equal(club.type, "Population");
		assert.ok(Entity.from(club.record()) instanceof Population);
		assert.ok(Entity.from({ type: "Unknown" }) instanceof Entity);
	}
};
