export default class Network {
	static async loadResource(id){
		try {
			const folder = new URL(`../library/${id}/`, import.meta.url);
			const info = await (await fetch(new URL("info.json", folder))).json();
			const resource = await (await fetch(new URL(`${info.current}/resource.json`, folder))).json();
			(await import("data:text/javascript;base64," + btoa("export function resourceFunc(Network) {" + resource.contents + "}"))).resourceFunc(Network);
		} catch (error) {
			alert(`Failed to load resource "${id}": ${error.message}`);
		}
	}
}
