// Each test gets the baseApp version being tested: this one or a newer one.
import assert from "node:assert/strict";

export default {
	"run() shows the demo's checks, all coming out as expected": async baseApp => {
		await baseApp.run();
		// The demo writes its results into the last element added to the page.
		const output = document.body.children[document.body.children.length - 1].textContent;
		assert.equal(output.split("Tree verifies: true").length - 1, 1);
		assert.equal(output.split("Query result verifies: true").length - 1, 2);
		assert.ok(output.includes("Tampered tree verifies: false"));
		assert.ok(output.includes("doesn't own"));
		assert.ok(output.includes("Peer tree verifies: true"));
		assert.ok(output.includes("Not newer than what we have"));
	}
};
