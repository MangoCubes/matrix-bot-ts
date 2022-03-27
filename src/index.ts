import Client from './Client';
import Olm from 'olm';
import { logger } from 'matrix-js-sdk/lib/logger';
import * as fs from 'fs';
import generateConfig from './generateConfig';

async function main(){
	logger.disableAll();
	global.Olm = Olm;
	if(!fs.existsSync('./config/credentials.json')) generateConfig();
	else {
		const client = new Client('./config/credentials.json', true);
		await client.init();
	}
}

main();