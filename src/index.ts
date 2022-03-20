import Client from './Client';
import Olm from 'olm';

async function main(){
	global.Olm = Olm;
	const client = new Client('./config/credentials.json');
	await client.init();
}

main();