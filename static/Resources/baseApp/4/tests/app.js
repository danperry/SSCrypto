// `resource` is the version being tested: this one or a newer one.
test("has a run function", () => {
	assert.equal(typeof resource.run, "function");
});
