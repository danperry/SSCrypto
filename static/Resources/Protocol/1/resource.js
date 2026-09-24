// signature: q6sX1+zD+iMnAT07mwrjDLPS/vZpd1ZU6tl2GQ/SPjP3C3egJqnhOoWVkM/EpE5k8ILge0T1EzR8132CKtnlDw==
// Protocol: the messages peers send each other about the tree.
//
//   { type: "get", query: { select, omit } }       -> { type: "result", tree }
//   { type: "put", path: [...], branch: {...} }     -> { type: "ok" }
//   anything that fails                             -> { type: "error", message }
//
// A "put" hands over a newer signed copy of an owned branch. It's accepted only
// if the branch has the same owner as ours, a bigger seq, and valid signatures.
const Crypto = await Network.loadResource("Crypto", 1);
const Tree = await Network.loadResource("Tree", 1);
const Query = await Network.loadResource("Query", 1);

async function handle(tree, message) {
	try {
		if (message.type === "get") return { type: "result", tree: await Query.run(tree, message.query) };
		if (message.type === "put") {
			await put(tree, message.path, message.branch);
			return { type: "ok" };
		}
		throw new Error(`Unknown message type "${message.type}"`);
	} catch (error) {
		return { type: "error", message: error.message };
	}
}

async function put(tree, path, branch) {
	branch = structuredClone(branch);
	const current = Tree.get(tree, path);
	if (!Tree.isObject(current) || !current.owner) throw new Error(`No owned branch at ${JSON.stringify(path)}`);
	if (Crypto.canonical(branch.owner) !== Crypto.canonical(current.owner)) throw new Error("Owner doesn't match");
	if (!(branch.seq > current.seq)) throw new Error("Not newer than what we have");
	if (!await Tree.verifyBranch(branch)) throw new Error("Bad signature");
	keepNewer(current, branch);
	// Swap the contents in place, so the node stays where it is in the tree.
	for (const key of Object.keys(current)) delete current[key];
	Object.assign(current, branch);
}

// The incoming branch may hold older copies of branches delegated from it.
// Where ours is newer (same owner, bigger seq), keep ours.
function keepNewer(ours, theirs) {
	for (const key of Object.keys(theirs)) {
		const a = Tree.isObject(ours) ? ours[key] : undefined;
		const b = theirs[key];
		if (key === "owner" || !Tree.isObject(b)) continue;
		if (b.owner && a?.owner && Crypto.canonical(a.owner) === Crypto.canonical(b.owner) && a.seq > b.seq) theirs[key] = a;
		else keepNewer(a, b);
	}
}

return { handle, put };
