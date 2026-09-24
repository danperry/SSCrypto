// `resource` is the version being tested: this one or a newer one.
test("CoreEntity is Dan Perry's User record", () => {
	assert.equal(resource.id, "danperry");
	assert.equal(resource.type, "User");
	assert.equal(resource.name, "Dan Perry");
	assert.equal(resource.scheme, "Ed25519");
	assert.equal(typeof resource.publicKey, "string");
});
