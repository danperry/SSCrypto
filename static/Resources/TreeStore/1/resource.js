// signature: pXrY3LkujuJ1ZBu9T/npNM3fV9b/raP/3tmwKbnxZtn8D4Wkbl0gy8bM3zBxXEzbScyGk323iS4nqOOIho7eDw==
// TreeStore: keeps the tree between page loads.
//
// The tree is kept in localStorage. When localStorage is empty, it's loaded from
// tree.json next to index.html. For now, saving also sends it to the local server
// (node/app.js), which writes tree.json to disk; anywhere else that part quietly fails.
const key = "SSCrypto.tree";

function treeFile() {
	return new URL("tree.json", document.baseURI);
}

// Returns { tree, from }: from is "localStorage" or "disk", or tree and from are null if nothing is saved.
export async function load() {
	try {
		const saved = localStorage.getItem(key);
		if (saved) return { tree: JSON.parse(saved), from: "localStorage" };
	} catch (error) {}
	try {
		const response = await fetch(treeFile(), { cache: "no-cache" });
		if (response.ok) return { tree: await response.json(), from: "disk" };
	} catch (error) {}
	return { tree: null, from: null };
}

// Saves to localStorage and tries to save to disk. Returns true if it reached the disk.
export async function save(tree) {
	const text = JSON.stringify(tree, null, 2) + "\n";
	try { localStorage.setItem(key, text); } catch (error) {}
	try {
		const response = await fetch(treeFile(), { method: "PUT", headers: { "Content-Type": "application/json" }, body: text });
		return response.ok;
	} catch (error) {
		return false;
	}
}
