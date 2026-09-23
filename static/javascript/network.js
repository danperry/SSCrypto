const LIBRARY = {
	baseApp: " alert('Loading Cow and Pig'); Network.loadResource('Cow'); Network.loadResource('Pig'); ",
	Cow: "alert('Cow and Pig Loaded')"
};


export default class Network {
	static async loadResource(id){
		(await import("data:text/javascript;base64," + btoa("export function resourceFunc(Network) {" + LIBRARY[id] + "}"))).resourceFunc(Network);
	}
}
