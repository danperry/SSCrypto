// Each test gets the baseApp version being tested: this one or a newer one.
import assert from "node:assert/strict";

export default {
	"has a run function": baseApp => {
		assert.equal(typeof baseApp.run, "function");
	}
};
