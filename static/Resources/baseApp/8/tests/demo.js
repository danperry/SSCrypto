// Each test gets the baseApp version being tested: this one or a newer one.
import assert from "node:assert/strict";

export default {
	"the demo tree's root owner is an id, listed in the root's own entities": async baseApp => {
		await baseApp.run();
		// The demo writes its results into the last element added to the page.
		const output = document.body.children[document.body.children.length - 1].textContent;
		const json = output.slice(output.indexOf("The tree: ") + "The tree: ".length, output.indexOf("\n\nTree verifies"));
		const tree = JSON.parse(json);
		assert.equal(tree.owner, "danperry");
		assert.equal(tree.entities.danperry.id, "danperry");
	}
};
