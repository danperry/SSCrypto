// signature: bXp7dxOSqjTuDeB19FkCc9p8g6nFt78KV9l9S68ip7eKlLd+TV9oUz17QfwwRIyoQ5nOyBd7KPFogCSwc+P7BA==
// baseApp: a demo of the signed tree, queries and the protocol, plus the saved tree.
const { User, Population } = await Network.loadResource("Entity", 1);
const CoreEntity = await Network.loadResource("CoreEntity", 2);
const Tree = await Network.loadResource("Tree", 3);
const Query = await Network.loadResource("Query", 2);
const Protocol = await Network.loadResource("Protocol", 2);
const TreeStore = await Network.loadResource("TreeStore", 1);

// Runs the demo and shows the results on the page.
export async function run() {
	const output = document.createElement("pre");
	document.body.append(output);
	function log(label, value) {
		output.textContent += label + (value === undefined ? "" : " " + JSON.stringify(value, null, 2)) + "\n\n";
	}

	// Dan's key lives only in this browser.
	let dan;
	try {
		const saved = localStorage.getItem("SSCrypto.coreKey");
		if (saved) dan = new User(JSON.parse(saved));
	} catch (error) {}
	if (!dan) {
		dan = await User.create("danperry", "Dan Perry");
		try { localStorage.setItem("SSCrypto.coreKey", JSON.stringify(dan)); } catch (error) {}
	}

	let core = { ...CoreEntity };
	if (core.publicKey !== dan.publicKey) {
		log("CoreEntity doesn't have this browser's key yet. This browser's public key is:", dan.publicKey);
		log("Using this browser's key as the root for the demo.");
		core = dan.record();
	}

	// Dan builds the root and delegates two branches.
	const tree = { owner: dan.record(), seq: 0 };
	await Tree.update(tree, ["notes"], { hello: "world", secret: "shh" }, dan);

	const alice = await User.create("alice", "Alice");
	await Tree.delegate(tree, ["games"], alice, dan);
	await Tree.update(tree, ["games", "scores"], { alice: 10 }, alice);

	const club = await Population.create("club", "Club");
	await Tree.delegate(tree, ["club"], club, dan);
	await Tree.update(tree, ["club", "members"], ["alice"], club);

	log("The tree:", tree);
	log("Tree verifies:", await Tree.verify(tree, core));

	// Queries.
	const scores = await Query.run(tree, { select: "$..scores" });
	log("Query $..scores:", scores);
	log("Query result verifies:", await Tree.verify(scores, core));

	const notes = await Query.run(tree, { select: "$.notes", omit: ["$.notes.secret"] });
	log("Query $.notes without secret:", notes);
	log("Query result verifies:", await Tree.verify(notes, core));

	// Tampering breaks the signature.
	const tampered = structuredClone(tree);
	tampered.games.scores.alice = 9999;
	log("Tampered tree verifies:", await Tree.verify(tampered, core));

	// Only the owner can update a branch.
	try {
		await Tree.update(tree, ["games", "scores"], { dan: 1 }, dan);
	} catch (error) {
		log("Dan updating Alice's branch:", error.message);
	}

	// Protocol: Alice updates her copy and sends the branch to another peer.
	const peer = structuredClone(tree);
	await Tree.update(tree, ["games", "scores"], { alice: 11 }, alice);
	const put = { type: "put", path: ["games"], branch: tree.games };
	log("Peer accepts Alice's update:", await Protocol.handle(peer, put));
	log("Peer's scores now:", peer.games.scores);
	log("Peer tree verifies:", await Tree.verify(peer, core));
	log("Same update sent again:", await Protocol.handle(peer, put));

	// The saved tree, kept between page loads (localStorage, or tree.json when that's empty).
	let { tree: saved, from } = await TreeStore.load();
	if (saved && !await Tree.verify(saved, core)) {
		log(`The saved tree from ${from} isn't signed by this root owner, so it was left alone.`);
		return;
	}
	if (!saved || !saved.entities) {
		// New, or from before entities lists: start the starter tree, keeping any notes.
		from = saved ? `${from}, upgraded to entities lists` : "a new tree";
		saved = await makeStarterTree(dan, saved?.notes || { created: new Date().toISOString() });
	}
	const reachedDisk = await TreeStore.save(saved);
	log(`Saved tree (loaded from ${from}; saved to localStorage${reachedDisk ? " and tree.json" : ""}):`, saved);
}

// A starter tree: the current users in the root's entities list, and two owned
// branches with their own dummy users and groups. The dummies' keys are only kept
// long enough to sign their branches.
async function makeStarterTree(dan, notes) {
	const alice = await User.create("alice", "Alice");
	const club = await Population.create("club", "Club");
	const tree = { owner: dan.id, seq: 0, entities: { [dan.id]: dan.record() } };
	await Tree.update(tree, ["notes"], notes, dan);
	await Tree.addEntity(tree, [], alice, dan);
	await Tree.addEntity(tree, [], club, dan);

	// Alice's games: her own users Bob and Carol, and a group that runs the arcade.
	const bob = await User.create("bob", "Bob");
	const carol = await User.create("carol", "Carol");
	const gamers = await Population.create("gamers", "Gamers");
	await Tree.delegate(tree, ["games"], alice, dan);
	await Tree.addEntity(tree, ["games"], bob, alice);
	await Tree.addEntity(tree, ["games"], carol, alice);
	await Tree.update(tree, ["games", "scores"], { alice: 10, bob: 7, carol: 12 }, alice);
	await Tree.delegate(tree, ["games", "arcade"], gamers, alice);
	await Tree.update(tree, ["games", "arcade", "members"], ["alice", "bob", "carol"], gamers);

	// The club: its own user Dave, and a committee that also has Alice from the root's list.
	const dave = await User.create("dave", "Dave");
	const committee = await Population.create("committee", "Committee");
	await Tree.delegate(tree, ["club"], club, dan);
	await Tree.addEntity(tree, ["club"], dave, club);
	await Tree.update(tree, ["club", "members"], ["alice", "dave"], club);
	await Tree.delegate(tree, ["club", "meetings"], committee, club);
	await Tree.update(tree, ["club", "meetings", "members"], ["alice", "dave"], committee);
	await Tree.update(tree, ["club", "meetings", "next"], "2026-11-01", committee);
	return tree;
}
