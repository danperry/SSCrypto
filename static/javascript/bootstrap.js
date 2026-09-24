import Network from "./network.js";

function start(account, app){
	Network.loadResource("baseApp").catch(error => alert(error.message));
}

export default start;
