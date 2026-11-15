// signature: 0D6+8YRsBJ/RetxXauJQMPK5y//DRVcQZTYZ0XbDixO0N0nentphtaxfKiksKtPfeg50ZhaHRCl/jYriOQYUDQ==
// TreeStore v2: like v1, but load() keeps the newest copy.
//
// v1 always preferred localStorage, so a tree.json changed outside the browser was
// overwritten by the browser's older copy. v2 reads both and keeps the one whose
// root seq is higher. When they're equal, localStorage wins, as in v1.
const TreeStore1 = await Network.loadResource("TreeStore", 1);
const key = "SSCrypto.tree";

// Saving is the same as v1.
export const save = TreeStore1.save;

// Returns { tree, from }: from is "localStorage" or "disk", or tree and from are null if nothing is saved.
export async function load() {
	let local = null;
	let disk = null;
	try { local = JSON.parse(localStorage.getItem(key)); } catch (error) {}
	try {
		const response = await fetch(new URL("tree.json", document.baseURI), { cache: "no-cache" });
		if (response.ok) disk = await response.json();
	} catch (error) {}

	if (disk && (!local || (disk.seq || 0) > (local.seq || 0))) return { tree: disk, from: "disk" };
	if (local) return { tree: local, from: "localStorage" };
	return { tree: null, from: null };
}
