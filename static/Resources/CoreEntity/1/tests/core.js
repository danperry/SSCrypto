// Each test gets the CoreEntity version being tested: this one or a newer one.
import assert from "node:assert/strict";

export default {
	"CoreEntity is Dan Perry's User record": CoreEntity => {
		assert.equal(CoreEntity.id, "danperry");
		assert.equal(CoreEntity.type, "User");
		assert.equal(CoreEntity.name, "Dan Perry");
		assert.equal(CoreEntity.scheme, "Ed25519");
		assert.equal(typeof CoreEntity.publicKey, "string");
	}
};
