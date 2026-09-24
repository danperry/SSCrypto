// signature: l01O9A86ClLSsc7Du5fIAGeRSLfdW2Yayw5mvOUBJjWfLQZJ3w0IwVRVw6ZRYlwtgz6PRr0sAzOaBIa6SMzTAA==
// Query: pick part of the tree with a small piece of JSONPath (RFC 9535).
//
//   $          the root
//   .name      a property          ['odd name']  a property with any characters
//   [0]        an array item       * or [*]      every child
//   ..name     "name" at any depth below here (also ..* and ..['name'])
//
// Query.run(tree, { select: "$..scores", omit: ["..secret"] })
// returns a copy of the tree holding only what was selected, minus what was omitted.
// Everything left out becomes { "#": hash }, so the result still passes Tree.verify.
const Tree = await Network.loadResource("Tree", 1);

// "$.a..b[0]" -> [{ key: "a" }, { key: "b", deep: true }, { key: 0 }]
export function parse(text) {
	if (text[0] !== "$") throw new Error(`Query must start with $: ${text}`);
	const steps = [];
	const token = /(\.\.|\.)?(?:(\*)|([A-Za-z_][\w-]*)|\[\*\]|\['([^']*)'\]|\[(\d+)\])/y;
	token.lastIndex = 1;
	while (token.lastIndex < text.length) {
		const position = token.lastIndex;
		const match = token.exec(text);
		if (!match) throw new Error(`Can't read query at "${text.slice(position)}"`);
		const [, dots, , name, quoted, index] = match;
		const key = name ?? quoted ?? (index !== undefined ? Number(index) : "*");
		steps.push({ key, deep: dots === ".." });
	}
	return steps;
}

// The keys of a node's children: numbers for arrays, strings for objects.
function childKeys(node) {
	if (!Tree.isObject(node)) return [];
	return Array.isArray(node) ? node.map((item, index) => index) : Object.keys(node);
}

// This path plus the paths of everything below it.
function allPaths(node, path) {
	const paths = [path];
	for (const key of childKeys(node)) paths.push(...allPaths(node[key], [...path, key]));
	return paths;
}

// Every path in the tree that matches the query text.
export function find(tree, text) {
	let paths = [[]];
	for (const step of parse(text)) {
		const next = [];
		for (const path of paths) {
			const starts = step.deep ? allPaths(Tree.get(tree, path), path) : [path];
			for (const start of starts) {
				for (const key of childKeys(Tree.get(tree, start))) {
					if (step.key === "*" || step.key === key) next.push([...start, key]);
				}
			}
		}
		paths = next;
	}
	return paths;
}

export async function run(tree, { select = "$", omit = [] } = {}) {
	const keep = find(tree, select);
	const hide = new Set(omit.flatMap(text => find(tree, text)).map(path => JSON.stringify(path)));
	const keepIds = new Set(keep.map(path => JSON.stringify(path)));
	const isAbove = path => keep.some(kept => kept.length > path.length && path.every((key, i) => kept[i] === key));
	return copy(tree, [], false);

	// inside is true once we are within a selected part.
	async function copy(node, path, inside) {
		if (hide.has(JSON.stringify(path))) return { "#": await Tree.hash(node) };
		inside = inside || keepIds.has(JSON.stringify(path));
		if (!inside && !isAbove(path)) return { "#": await Tree.hash(node) };
		if (!Tree.isObject(node)) return node;
		const result = Array.isArray(node) ? [] : {};
		for (const key of childKeys(node)) {
			// Owned nodes above a selection keep what's needed to check their signature.
			const needed = !inside && ["owner", "seq", "signature"].includes(key);
			result[key] = needed ? node[key] : await copy(node[key], [...path, key], inside);
		}
		return result;
	}
}
