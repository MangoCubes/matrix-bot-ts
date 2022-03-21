import { readFileSync } from 'fs';
import sdk, { ClientEvent, MatrixEvent, Room, RoomEvent, RoomMemberEvent } from 'matrix-js-sdk';
import { CryptoEvent, verificationMethods } from 'matrix-js-sdk/lib/crypto';
import { LocalStorageCryptoStore } from 'matrix-js-sdk/lib/crypto/store/localStorage-crypto-store';
import { VerificationRequest } from 'matrix-js-sdk/lib/crypto/verification/request/VerificationRequest';
import { ISasEvent, SasEvent } from 'matrix-js-sdk/lib/crypto/verification/SAS';
import { LocalStorage } from 'node-localstorage';
import * as readline from 'readline';
import { inspect } from 'util';

export default class Client{
	client: sdk.MatrixClient;
	prefix: string;
	userId: string | null;
	deviceId: string | null;
	debugMode: boolean;
	constructor(configDir: string, debugMode?: boolean){
		const config = JSON.parse(readFileSync(configDir, 'utf8'));
		const localStorage = new LocalStorage(config.storage);
		this.debugMode = debugMode ? true : false;
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
			this.client.on(CryptoEvent.VerificationRequest, this.verificationHandler.bind(this));
/*
			this.client.on(RoomMemberEvent.Membership, this.membershipHandler.bind(this));

			this.client.on(ClientEvent.ToDeviceEvent, e => {
				//console.log(e);
			});

			this.client.on(RoomEvent.Timeline, async (e: MatrixEvent, room: Room) => {
				if (e.event.type === 'm.room.encrypted') {
					await this.messageHandler(room.roomId, e);
					//if(event.clearEvent.content.msgtype === 'm.key.verification.request') ;
				}
			});*/


			this.userId = this.client.getUserId();
			if (this.debugMode) console.log('Client started as ' + this.userId + '.');
		} catch(e){
			console.log('Unable to start client: ' + e);
		}
	}

	async verificationHandler(req: VerificationRequest){
		const verifier = req.beginKeyVerification(verificationMethods.SAS);
		req.verifier.once(SasEvent.ShowSas, async (e: ISasEvent) => {
			if (e.sas.decimal) console.log(`Decimal: ${e.sas.decimal.join(', ')}`);
			if (e.sas.emoji){
				let emojis = [];
				for(const emoji of e.sas.emoji) emojis.push(`${emoji[0]} (${emoji[1]})`);
				console.log(`Emojis: ${emojis.join(', ')}`);
			}
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			rl.setPrompt('Do the emojis/decimals match? (c: Cancel) [y/n/c]: ');
			rl.prompt();
			rl.on('line', (line) => {
				switch(line.trim().toLowerCase()) {
					case 'y':
						e.confirm();
						rl.write('Verified. Please wait until the peer verifies their emoji.');
						rl.close();
						return;
					case 'n':
						e.mismatch();
						rl.write('Emojis do not match; Communication may be compromised.');
						rl.close();
						return;
					case 'c':
						e.cancel();
						rl.write('Verification cancelled.');
						rl.close();
						return;
				}
				rl.prompt();
			});
		});
		try{
			await verifier.verify();
			console.log('Verification successful.');
		} catch(e){
			console.log('Verification cancelled.');
			return;
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

	async messageHandler(roomId: string, data: MatrixEvent){
		if (data.isRedacted()) return;
        if (data.sender.userId === this.userId) return;
		const e = await this.client.crypto.decryptEvent(data);
		const cmd = (e.clearEvent.content.body as string).split(' ');
	}
}