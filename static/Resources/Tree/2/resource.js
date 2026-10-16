// signature: 47gV64qmy4inGhG0L2Rh+Elm9umjKW0PbpJcRrT39pvE44jMzWmW08yxJ9Sa7e5ow1d5cuq6UFeawvosxLZXDQ==
// Tree: the signed JSON tree.
//
// Reserved property names:
//   owner     - on a node, gives that branch to an entity: its id (or, in older trees, its whole record)
//   entities  - on an owned node, the entities its owner lists: { id: record }
//   seq       - update counter of an owned node; bigger is newer
//   signature - the owner's signature over the node's hash
//   "#"       - { "#": hash } stands in for a part of the tree that was left out
//
// An owner signs its branch down to the next "owner" and no further.
// The parent's signature only covers a delegated child's owner block.
//
// An owner id is looked up in the entities lists of the owned branches above it,
// nearest first, up to the root. A branch's own list never counts for its own
// owner, except at the root, whose owner is checked against CoreEntity by verify.
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

// Finds an owner's record. owner is an id, looked up in lists (nearest last),
// or a whole record (older trees).
function findIn(lists, owner) {
	if (isObject(owner)) return owner;
	for (let i = lists.length - 1; i >= 0; i--) {
		if (isObject(lists[i]) && isObject(lists[i][owner])) return lists[i][owner];
	}
	return null;
}

// Checks an owned node's signature, and every delegated branch inside it.
// lists are the entities lists from the owned branches above it (nearest last).
export async function verifyBranch(node, lists = []) {
	const record = findIn(lists, node.owner);
	if (!record || !await Entity.from(record).verify(await contentHash(node), node.signature)) return false;
	const below = [...lists, node.entities || {}];
	for (const child of delegatedChildren(node)) {
		if (!await verifyBranch(child, below)) return false;
	}
	return true;
}

// Checks the whole tree. core is the record of the entity trusted to own the root.
export async function verify(tree, core) {
	if (!tree.owner) return false;
	if (isObject(tree.owner) ? Crypto.canonical(tree.owner) !== Crypto.canonical(core) : tree.owner !== core.id) return false;
	return verifyBranch(tree, [{ [core.id]: core }]);
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

	const { parent, owned, ownedLists } = walk(tree, path);
	const record = owned.owner && findIn(ownedLists, owned.owner);
	if (!record || record.id !== entity.id || record.publicKey !== entity.publicKey) {
		throw new Error(`"${entity.id}" doesn't own ${JSON.stringify(path)}`);
	}

	if (value === undefined) delete parent[last];
	else parent[last] = value;
	owned.seq = (owned.seq || 0) + 1;
	await sign(owned, entity);
}

// Walks down to the parent of the spot at path. Returns that parent; the nearest
// owned node at or above it, with its path and the lists its owner is looked up in;
// and the entities lists a node at path can use (nearest last).
function walk(tree, path) {
	let parent = tree;
	let owned = tree;
	let ownedPath = [];
	const lists = [tree.entities || {}];
	let ownedLists = lists.slice();
	for (let i = 0; i < path.length - 1; i++) {
		parent = parent[path[i]];
		if (!isObject(parent)) throw new Error(`No branch at ${JSON.stringify(path)}`);
		if (parent.owner) {
			owned = parent;
			ownedPath = path.slice(0, i + 1);
			ownedLists = lists.slice();
			lists.push(parent.entities || {});
		}
	}
	return { parent, owned, ownedPath, ownedLists, lists };
}

// The entities lists a node at path can use for its owner, nearest last.
export function entityLists(tree, path) {
	return walk(tree, path).lists;
}

// The record a node at path would get for this owner id, or null.
export function findEntity(tree, path, id) {
	return findIn(entityLists(tree, path), id);
}

// Adds newEntity to the entities list of the owned branch at path. Only that branch's owner may do this.
export async function addEntity(tree, path, newEntity, entity) {
	const node = get(tree, path);
	if (!isObject(node) || !node.owner) throw new Error(`No owned branch at ${JSON.stringify(path)}`);
	await update(tree, [...path, "entities"], { ...node.entities, [newEntity.id]: newEntity.record() }, entity);
}

// Gives the branch at path to another entity. Anything already there is replaced.
// If the new owner isn't already known above path, it's added to the delegator's entities list.
// The new owner then signs their branch (Tree.sign) or makes an update.
export async function delegate(tree, path, delegateEntity, entity) {
	const { ownedPath, lists } = walk(tree, path);
	const known = findIn(lists, delegateEntity.id);
	if (!known) await addEntity(tree, ownedPath, delegateEntity, entity);
	else if (known.publicKey !== delegateEntity.publicKey) throw new Error(`A different "${delegateEntity.id}" is already known here`);
	await update(tree, path, { owner: delegateEntity.id, seq: 0 }, entity);
}
