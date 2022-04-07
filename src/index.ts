import Client from './Client';
import Olm from '@matrix-org/olm';
import { logger } from 'matrix-js-sdk/lib/logger';
import * as fs from 'fs';
import generateConfig from './generateConfig';
import express from 'express';

async function main(){
	logger.disableAll();
	global.Olm = Olm;
	if(!fs.existsSync('./config/credentials.json')) generateConfig();
	else {
		const app = express();
		const client = new Client('./config/credentials.json', true);
		const port = 8888;
		await client.init();
		app.set('client', client);
		app.get('/', async (req, res) => {
			await client.logMessage('Heard!');
			res.sendStatus(200);
		});
		app.listen(port, () => {
            console.log(`Listening on port ${port}`);
        });
	}
}

main();