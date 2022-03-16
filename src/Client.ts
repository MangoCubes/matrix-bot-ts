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
	prefix: string;
	userId: string | null;
	constructor(configDir: string){
		const config = JSON.parse(readFileSync(configDir, 'utf8'));
		this.client = new MatrixClient(
			config.serverUrl,
			config.accessToken,
			new SimpleFsStorageProvider(path.join(config.storage, 'bot.json')),
			new RustSdkCryptoStorageProvider(path.join(config.storage, 'crypto'))
		);
		this.prefix = config.prefix;
		this.client.setJoinStrategy(new SimpleRetryJoinStrategy());
		AutojoinRoomsMixin.setupOnClient(this.client);
		this.userId = null;
	}

	async init(){
		this.client.on('room.message', this.handleMessage.bind(this));
		await this.client.start();
		this.userId = await this.client.getUserId();
		console.log('Client started.');
	}

	async sendMessage(message: string, roomId: string){
		await this.client.sendMessage(roomId, {
            body: message,
            msgtype: 'm.text',
        });
	}

	async handleMessage(roomId: string, data: any){
		if (data.isRedacted) return;
        if (data.sender === this.userId) return;
        if (data.content.msgtype !== "m.text") return;
		if ((data.content.body as string).startsWith(this.prefix)) {
			this.sendMessage(data.content.body, roomId);
		}
	}
}