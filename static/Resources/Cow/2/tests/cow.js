// Each test gets the Cow version being tested: this one or a newer one.
import assert from "node:assert/strict";

export default {
	"loads": Cow => {
		assert.equal(typeof Cow, "object");
	}
};
