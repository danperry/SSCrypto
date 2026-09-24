// signature: bzjiU3ltzA6LFpo21NxNTgnX0cpUHVKNTP2ElrBNjGZntGOCvmbc6iS3DP+mTJYmhgJWUynGKuJU3J8IF4m7CQ==
// Tree: the signed JSON tree.
//
// Reserved property names:
//   owner     - on a node, gives that branch to an entity (its public record)
//   seq       - update counter of an owned node; bigger is newer
//   signature - the owner's signature over the node's hash
//   "#"       - { "#": hash } stands in for a part of the tree that was left out
//
// An owner signs its branch down to the next "owner" and no further.
// The parent's signature only covers a delegated child's owner block.
const Crypto = await Network.loadResource("Crypto", 1);
const { Entity } = await Network.loadResource("Entity", 1);

export function isObject(value) {
	return value !== null && typeof value === "object";
}

export function isStub(value) {
	return isObject(value) && Object.keys(value).length === 1 && "#" in value;
}

// The hash a parent sees for a child: a delegated branch counts only its owner block.
export async function hash(node) {
	if (isObject(node) && node.owner) return contentHash({ owner: node.owner });
	return contentHash(node);
}

// The hash of a node's own content: every child is replaced by its hash, then
// the result is hashed. This is what an owner signs. The signature itself is skipped.
export async function contentHash(node) {
	if (isStub(node)) return node["#"];
	if (!isObject(node)) return Crypto.hash(Crypto.canonical(node));
	const parts = Array.isArray(node) ? [] : {};
	for (const key of Object.keys(node)) {
		if (key !== "signature") parts[key] = await hash(node[key]);
	}
	return Crypto.hash(Crypto.canonical(parts));
}

export async function sign(node, entity) {
	node.signature = await entity.sign(await contentHash(node));
}

// The delegated branches just below this node (not counting deeper ones).
function delegatedChildren(node) {
	const found = [];
	for (const key of Object.keys(node)) {
		const child = node[key];
		if (key === "owner" || !isObject(child)) continue;
		if (child.owner) found.push(child);
		else found.push(...delegatedChildren(child));
	}
	return found;
}

// Checks an owned node's signature, and every delegated branch inside it.
export async function verifyBranch(node) {
	const owner = Entity.from(node.owner);
	if (!await owner.verify(await contentHash(node), node.signature)) return false;
	for (const child of delegatedChildren(node)) {
		if (!await verifyBranch(child)) return false;
	}
	return true;
}

// Checks the whole tree. core is the record of the entity trusted to own the root.
export async function verify(tree, core) {
	if (!tree.owner || Crypto.canonical(tree.owner) !== Crypto.canonical(core)) return false;
	return verifyBranch(tree);
}

// Follows a path (a list of keys) down the tree.
export function get(tree, path) {
	let node = tree;
	for (const key of path) node = isObject(node) ? node[key] : undefined;
	return node;
}

// Sets (or deletes, if value is undefined) the value at path, then the owner
// of that spot bumps seq and signs again. Only that owner may do this.
export async function update(tree, path, value, entity) {
	const last = path[path.length - 1];
	if (path.length === 0) throw new Error("Can't replace the root");
	if (["owner", "seq", "signature"].includes(last)) throw new Error(`"${last}" can't be set directly; use delegate`);

	// Walk to the parent of the spot being changed, remembering the nearest owned node.
	let parent = tree;
	let owned = tree.owner ? tree : null;
	for (const key of path.slice(0, -1)) {
		parent = parent[key];
		if (!isObject(parent)) throw new Error(`No branch at ${JSON.stringify(path)}`);
		if (parent.owner) owned = parent;
	}
	if (!owned || owned.owner.id !== entity.id || owned.owner.publicKey !== entity.publicKey) {
		throw new Error(`"${entity.id}" doesn't own ${JSON.stringify(path)}`);
	}

	if (value === undefined) delete parent[last];
	else parent[last] = value;
	owned.seq = (owned.seq || 0) + 1;
	await sign(owned, entity);
}

// Gives the branch at path to another entity. Anything already there is replaced.
// The new owner then signs their branch (Tree.sign) or makes an update.
export async function delegate(tree, path, delegateEntity, entity) {
	await update(tree, path, { owner: delegateEntity.record(), seq: 0 }, entity);
}
