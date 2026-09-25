// Each test gets the baseApp version being tested: this one or a newer one.
import assert from "node:assert/strict";

// The demo writes its results into the last element added to the page.
function lastOutput() {
	return document.body.children[document.body.children.length - 1].textContent;
}

export default {
	"run() saves the tree and loads it again next time": async baseApp => {
		localStorage.removeItem("SSCrypto.tree");
		await baseApp.run();
		const first = JSON.parse(localStorage.getItem("SSCrypto.tree"));
		assert.ok(first.owner && first.signature && first.notes.created);

		await baseApp.run();
		assert.ok(lastOutput().includes("Saved tree (loaded from localStorage"));
		assert.deepEqual(JSON.parse(localStorage.getItem("SSCrypto.tree")), first);
	},

	"run() leaves a saved tree alone if it isn't signed by the root owner": async baseApp => {
		const forged = { owner: { id: "someone", type: "User", scheme: "Ed25519", publicKey: "" }, seq: 1, signature: "" };
		localStorage.setItem("SSCrypto.tree", JSON.stringify(forged));
		await baseApp.run();
		assert.ok(lastOutput().includes("left alone"));
		assert.deepEqual(JSON.parse(localStorage.getItem("SSCrypto.tree")), forged);
		localStorage.removeItem("SSCrypto.tree");
	}
};
