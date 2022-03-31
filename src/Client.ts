import { readFileSync } from 'fs';
import sdk, { ClientEvent, MatrixEvent, MsgType, Preset, Room, RoomEvent, RoomMemberEvent } from 'matrix-js-sdk';
import { CryptoEvent, verificationMethods } from 'matrix-js-sdk/lib/crypto';
import { DecryptionError, UnknownDeviceError } from 'matrix-js-sdk/lib/crypto/algorithms';
import { LocalStorageCryptoStore } from 'matrix-js-sdk/lib/crypto/store/localStorage-crypto-store';
import { VerificationRequest } from 'matrix-js-sdk/lib/crypto/verification/request/VerificationRequest';
import { ISasEvent, SasEvent } from 'matrix-js-sdk/lib/crypto/verification/SAS';
import { LocalStorage } from 'node-localstorage';
import * as readline from 'readline';

export default class Client{
	client: sdk.MatrixClient;
	prefix: string;
	userId: string | null;
	deviceId: string | null;
	debugMode: boolean;
	token: string;
	logRoom: string;
	dmRooms: {[rid: string]: string};
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
		this.deviceId = config.deviceId;
		this.userId = config.userId;
		this.token = config.accessToken;
		this.logRoom = config.logRoom;
		this.dmRooms = {};
	}

	async init(){
		try{
			await this.client.initCrypto();
			await this.client.startClient({ initialSyncLimit: 0 });
			
			this.client.on(CryptoEvent.VerificationRequest, this.verificationHandler.bind(this));

			this.client.on(RoomMemberEvent.Membership, this.membershipHandler.bind(this));
			// this.client.on(ClientEvent.ToDeviceEvent, e => {
			// 	console.log(e)
			// });
			this.client.on(RoomEvent.Timeline, async (e: MatrixEvent, room: Room) => {
				if (e.isEncrypted()) await this.messageHandler(room.roomId, e);
			});
			this.client.on(ClientEvent.Sync, async (state, lastState, data) => {
				if(state === 'PREPARED'){
					await this.client.uploadKeys();
					await this.refreshDMRooms();
					await this.sendMessage(this.logRoom, 'Client started!', false);
					console.log('Client started.');
				}
			});
			// this.client.on('event', (e) => {
			// 	console.log(e)
			// })
		} catch(e){
			console.log('Unable to start client: ' + e);
		}
	}

	async sendVerification(userId: string){
		const req = await this.client.requestVerification(userId);
		await req.waitFor(() => req.started || req.cancelled);
		if (req.cancelled) this.logMessage('Verification cancelled by user.', false);
		else await this.verificationHandler(req);
	}

	async verificationHandler(req: VerificationRequest){
		console.log(req)
		if (!req.verifier) {
			if (!req.initiatedByMe) {
				req.beginKeyVerification(verificationMethods.SAS);
				await req.accept();
			} else await req.waitFor(() => req.started || req.cancelled);
			if (req.cancelled) {
				this.logMessage('Verification cancelled.', false);
				return;
			}
		}
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
			rl.on('line', async (line) => {
				switch(line.trim().toLowerCase()) {
					case 'y':
						await e.confirm();
						console.log('Verified. Please wait until the peer verifies their emoji.');
						rl.close();
						return;
					case 'n':
						e.mismatch();
						console.log('Emojis do not match; Communication may be compromised.');
						rl.close();
						return;
					case 'c':
						e.cancel();
						console.log('Verification cancelled.');
						rl.close();
						return;
				}
				rl.prompt();
			});
		});
		try{
			await req.verifier.verify();
			this.logMessage('Verification successful.', false);
		} catch(e){
			this.logMessage('Verification cancelled.', true);
			this.logMessage(e, true);
			return;
		}
	}

	async sendMessage(roomId: string, message: string, sendingErrorMessage: boolean){ //Must not throw errors
		try{
			const room = this.client.getRoom(roomId);
			if(room === null) {
				this.logMessage(`Invalid room: ${roomId}`, true);
				return;
			}
			let verifiedMembers = [];
			let unverifiedMembers = [];
			const members = await room.getEncryptionTargetMembers();
			for (const m of members) {
				const devices = this.client.getStoredDevicesForUser(m.userId);
				let verified = true;
				for(const d of devices) {
					if(d.isUnverified()) {
						verified = false;
						unverifiedMembers.push(m.userId);
						break;
					}
				}
				if(verified) verifiedMembers.push(m.userId);
			}
			if(unverifiedMembers.length) {
				for(const m of verifiedMembers) {
					if(m !== this.userId) await this.sendDM(m, 
						`Room ${room.roomId} has unverified members:\n${unverifiedMembers.join('\n')}\nOriginal message:\n${message}`
					);
				}
				for(const m of unverifiedMembers) this.sendVerification(m);
			} else {
				console.log('All members verified: ' + unverifiedMembers.toString())
				await this.client.sendMessage(roomId, {
					body: message,
					msgtype: 'm.text',
				});
			}
		} catch(e){
			if (sendingErrorMessage) {
				console.log(message);
				return;
			}
			if(e instanceof UnknownDeviceError){
				for(const d in e.devices) await this.sendVerification(d);
			} else await this.sendMessage(roomId, message, true);
		}
	}

	async logMessage(message: string, sendingErrorMessage: boolean){
		if(this.logRoom) await this.sendMessage(this.logRoom, message, sendingErrorMessage);
		else console.log(message);
	}

	async refreshDMRooms(){
		const rooms = this.client.getRooms();
		for(const r of rooms){
			const members = r.getMembers();
			if(members.length === 2){
				if(members[0].membership === 'leave' || members[1].membership === 'leave') continue;
				if(!members[0].getDMInviter() && !members[1].getDMInviter()) continue;
				if(members[0].userId === this.userId) this.dmRooms[members[1].userId] = r.roomId;
				else this.dmRooms[members[0].userId] = r.roomId;
			}
		}
	}

	async sendDM(userId: string, message: string){
		let room = this.dmRooms[userId];
		try{
			if(!room){
				const roomId = await this.client.createRoom({preset: Preset.TrustedPrivateChat, invite: [userId], is_direct: true});
				this.dmRooms[userId] = roomId.room_id;
				room = roomId.room_id;
			}
			await this.client.sendMessage(room, {
				body: message,
				msgtype: 'm.text',
			});
		}catch(e){
			if(e instanceof UnknownDeviceError){
				for(const d in e.devices) this.sendVerification(d);
			}
		}
	}

	async membershipHandler (e: sdk.MatrixEvent, m: sdk.RoomMember, o: string | null) {
		if (m.membership === 'invite' && m.userId === this.userId) {
			await this.client.joinRoom(m.roomId);
			await this.refreshDMRooms();
			this.logMessage(`Successfully joined ${m.roomId}.`, false);
		}
	}

	async messageHandler(roomId: string, data: MatrixEvent){
		if (data.isRedacted()) return;
		if (data.sender.userId === this.userId) return;
		try{
			const e = await this.client.crypto.decryptEvent(data);
			if(e.clearEvent.content.msgtype === MsgType.KeyVerificationRequest) return;
			const cmd = (e.clearEvent.content.body as string).split(' ');
			if(cmd[0] === 'echo') this.sendMessage(roomId, cmd[1], false);
			if(cmd[0] === 'invalidate') {
				await this.client.setDeviceVerified(data.sender.userId, data.getContent().device_id, false);
			}
		} catch(err){
			if(err instanceof DecryptionError && err.code === 'MEGOLM_UNKNOWN_INBOUND_SESSION_ID') await this.sendMessage(roomId, 'Re-creating new secure channel. Please try again.', false);
			else {
				console.log('Error handling message: ');
				console.log(err)
			}
		}
	}
}