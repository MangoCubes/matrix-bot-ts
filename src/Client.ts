import { readFileSync } from 'fs';
import sdk, { ClientEvent, MatrixEvent, Room, RoomEvent, RoomMemberEvent } from 'matrix-js-sdk';
import { LocalStorageCryptoStore } from 'matrix-js-sdk/lib/crypto/store/localStorage-crypto-store';
import { LocalStorage } from 'node-localstorage';

export default class Client{
	client: sdk.MatrixClient;
	prefix: string;
	userId: string | null;
	deviceId: string | null;
	constructor(configDir: string){
		const config = JSON.parse(readFileSync(configDir, 'utf8'));
		const localStorage = new LocalStorage(config.storage);
		this.client = sdk.createClient({
			baseUrl: config.serverUrl,
			accessToken: config.accessToken,
			cryptoStore: new LocalStorageCryptoStore(localStorage),
			sessionStore: {
				getLocalTrustedBackupPubKey: () => null,
			},
			userId: config.userId,
		    deviceId: config.deviceId,
		});
		this.prefix = config.prefix;
		this.deviceId = null;
		this.userId = null;
	}

	async init(){
		try{
			await this.client.initCrypto();
			await this.client.startClient({ initialSyncLimit: 0 });
        	this.client.uploadKeys();
			this.client.on(ClientEvent.Sync, (state) => {

			});

			this.client.on(RoomMemberEvent.Membership, this.membershipHandler.bind(this));

			this.client.on(ClientEvent.ToDeviceEvent, e => {
				console.log(e);
			});

			this.client.on(RoomEvent.Timeline, async (e: MatrixEvent, room: Room) => {
				console.log(e);
				if (e.event.type === 'm.room.encrypted') {
					const event = await this.client.crypto.decryptEvent(e);
					//console.log(event)
					//this.sendMessage('!bAcbCoXicoDBTeXRSc:matrix.skew.ch', '12341234')
				}
			});

			this.userId = this.client.getUserId();
			console.log('Client started as ' + this.userId + '.');
		} catch(e){
			console.log('Unable to start client: ' + e);
		}
	}

	async sendMessage(roomId: string, message: string){
		await this.client.sendMessage(roomId, {
            body: message,
            msgtype: 'm.text',
        });
	}

	async membershipHandler (e: sdk.MatrixEvent, m: sdk.RoomMember, o: string | null) {
		if (m.membership === 'invite' && m.userId === this.userId) {
			await this.client.joinRoom(m.roomId);
			console.log(`Successfully joined ${m.roomId}.`);
		}
	}

	async handleMessage(roomId: string, data: any){
		if (data.isRedacted) return;
        if (data.sender === this.userId) return;
        if (data.content.msgtype !== 'm.text') return;
		if ((data.content.body as string).startsWith(this.prefix)) {
			this.sendMessage(data.content.body, roomId);
		}
	}
}