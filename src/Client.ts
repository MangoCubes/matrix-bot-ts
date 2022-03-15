import {
	AutojoinRoomsMixin,
    MatrixClient,
	RustSdkCryptoStorageProvider,
    SimpleFsStorageProvider,
	SimpleRetryJoinStrategy,
} from "matrix-bot-sdk";
import { readFileSync } from 'fs';
import path from "path";

export default class Client{
	client: MatrixClient;
	constructor(configDir: string){
		const config = JSON.parse(readFileSync(configDir, 'utf8'));
		this.client = new MatrixClient(
			config.serverUrl,
			config.accessToken,
			new SimpleFsStorageProvider(path.join(config.storage, 'bot.json')),
			new RustSdkCryptoStorageProvider(path.join(config.storage, 'crypto'))
		);
		this.client.setJoinStrategy(new SimpleRetryJoinStrategy());
		AutojoinRoomsMixin.setupOnClient(this.client);
	}

	async start(){
		await this.client.start();
		console.log('Client started.');
	}

	async sendMessage(){

	}
}