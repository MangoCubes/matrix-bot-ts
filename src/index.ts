import * as olm from 'olm';
import Client from './Client';

global.Olm = olm;

async function main(){
	const client = new Client('./config/credentials.json');
	await client.init();
}

main();