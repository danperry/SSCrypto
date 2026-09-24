// `resource` is the version being tested: this one or a newer one.
test("publicKey comes from coreEntity.json", async () => {
	const file = await (await fetch(new URL("coreEntity.json", document.baseURI))).json();
	assert.equal(resource.publicKey, file.publicKey);
	assert.ok(resource.publicKey.length > 0);
});
