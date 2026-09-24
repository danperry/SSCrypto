// Each test gets the CoreEntity version being tested: this one or a newer one.
import assert from "node:assert/strict";

export default {
	"publicKey comes from coreEntity.json": async CoreEntity => {
		const file = await (await fetch(new URL("coreEntity.json", document.baseURI))).json();
		assert.equal(CoreEntity.publicKey, file.publicKey);
		assert.ok(CoreEntity.publicKey.length > 0);
	}
};
