// signature: 1jTi/7R0we8sMjYHNXkvSouMz9AZChdnLiR9M2ntIJxfVGxP7KP+pMmYSIEqhrAvf4Lw1kLPPsVl/LLOKdgyDQ==
// baseApp: a demo of the signed tree, queries and the protocol.
const { User, Population } = await Network.loadResource("Entity", 1);
const CoreEntity = await Network.loadResource("CoreEntity", 1);
const Tree = await Network.loadResource("Tree", 1);
const Query = await Network.loadResource("Query", 1);
const Protocol = await Network.loadResource("Protocol", 1);

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
	await Tree.update(tree, ["club", "members"], { alice: alice.record() }, club);

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
}
