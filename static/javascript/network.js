const LIBRARY = {
	baseApp: "Horse"
};


export default class Network {
	static loadResource(id){
		alert(LIBRARY[id]);
	}
}