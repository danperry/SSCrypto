// `resource` is the version being tested: this one or a newer one.
test("canonical sorts object keys at every level and keeps array order", () => {
	assert.equal(resource.canonical({ b: 1, a: { d: [3, 1], c: "x" } }), '{"a":{"c":"x","d":[3,1]},"b":1}');
});

test("hash gives the same base64 SHA-256 for the same text", async () => {
	const a = await resource.hash("hello");
	assert.equal(a, "LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=");
	assert.notEqual(a, await resource.hash("hello!"));
});

test("base64 round trips bytes", () => {
	const bytes = new Uint8Array([0, 1, 250, 255]);
	assert.deepEqual([...resource.fromBase64(resource.toBase64(bytes))], [...bytes]);
});

test("Ed25519 signs and verifies", async () => {
	const ed = resource.schemes.Ed25519;
	const keys = await ed.generate();
	const signature = await ed.sign(keys.privateKey, "message");
	assert.equal(await ed.verify(keys.publicKey, "message", signature), true);
	assert.equal(await ed.verify(keys.publicKey, "other message", signature), false);
});
