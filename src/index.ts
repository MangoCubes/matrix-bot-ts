import Client from './Client';
import Olm from 'olm';
import { logger } from 'matrix-js-sdk/lib/logger';

async function main(){
	logger.disableAll();
	global.Olm = Olm;
	const client = new Client('./config/credentials.json', true);
	await client.init();
}

main();