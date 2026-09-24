// Each resource version only runs once; later loads get the same result.
const loaded = {};

export default class Network {
	// Runs a resource and returns whatever its code returns.
	static async loadResource(id, version){
		const folder = new URL(`../Resources/${id}/`, import.meta.url);
		try {
			if (!version) {
				version = (await (await fetch(new URL("info.json", folder), { cache: "no-cache" })).json()).current;
			}
			const key = `${id}/${version}`;
			if (!loaded[key]) loaded[key] = run(new URL(`${version}/resource.json`, folder));
			return await loaded[key];
		} catch (error) {
			throw new Error(`Failed to load resource "${id}": ${error.message}`);
		}
	}
}

async function run(url){
	const resource = await (await fetch(url, { cache: "force-cache" })).json();
	const code = "export default async function (Network) {" + resource.contents + "\n}";
	const module = await import(URL.createObjectURL(new Blob([code], { type: "text/javascript" })));
	return module.default(Network);
}
