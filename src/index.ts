import Client from "./Client";
import * as olm from 'olm';

global.Olm = olm;

async function main(){
	const client = new Client('./config/credentials.json');
	await client.start();
	client.sendMessage('msg', '!qhgXqbntifEwONeAdZ:matrix.skew.ch');
}

main();