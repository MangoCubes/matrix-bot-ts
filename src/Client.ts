import { readFileSync } from 'fs';
import sdk, { ClientEvent, EventType, JoinRule, MatrixEvent, MemoryCryptoStore, MemoryStore, MsgType, Preset, RestrictedAllowType, Room, RoomCreateTypeField, RoomEvent, RoomMemberEvent, RoomType, Visibility } from 'matrix-js-sdk';
import { CryptoEvent, verificationMethods } from 'matrix-js-sdk/lib/crypto';
import { DecryptionError, UnknownDeviceError } from 'matrix-js-sdk/lib/crypto/algorithms';
import { LocalStorageCryptoStore } from 'matrix-js-sdk/lib/crypto/store/localStorage-crypto-store';
import { VerificationEvent } from 'matrix-js-sdk/lib/crypto/verification/Base';
import { VerificationRequest, VerificationRequestEvent } from 'matrix-js-sdk/lib/crypto/verification/request/VerificationRequest';
import { ISasEvent, SasEvent } from 'matrix-js-sdk/lib/crypto/verification/SAS';
import { LocalStorage } from 'node-localstorage';
import path from 'path';
import * as readline from 'readline';
import Command from './commands/Command';

type RoomSecurity = {res: 0 | 1 | 2} | {res: 3, unverified: string[], verified: string[]};

export default class Client{
	client: sdk.MatrixClient;
	prefix: string;
	userId: string | null;
	deviceId: string | null;
	debugMode: boolean;
	token: string;
	logRoom: string;
	dmRooms: {[rid: string]: string};
	domain: string;
	constructor(configDir: string, debugMode?: boolean){
		const config = JSON.parse(readFileSync(configDir, 'utf8'));
		const cryptoStore = new LocalStorageCryptoStore(new LocalStorage(path.join(config.storage, 'crypto')));
		const sessionStore = new MemoryCryptoStore();
		this.debugMode = debugMode ? true : false;
		this.client = sdk.createClient({
			baseUrl: config.serverUrl,
			accessToken: config.accessToken,
			cryptoStore: cryptoStore,
			sessionStore: sessionStore,
			userId: config.userId,
			deviceId: config.deviceId,
			verificationMethods: ['m.sas.v1'],
		});
		this.prefix = config.prefix;
		this.deviceId = config.deviceId;
		this.userId = config.userId;
		this.token = config.accessToken;
		this.logRoom = config.logRoom;
		this.domain = config.domain;
		this.dmRooms = {};
	}

	async init(){
		try{
			await this.client.initCrypto();
			await this.client.startClient({ initialSyncLimit: 0 });
			this.client.setGlobalErrorOnUnknownDevices(true);
			if(!this.client.isCryptoEnabled()){
				console.log('Crypto not enabled. Quitting.');
				process.exit(1);
				return;
			}
			
			this.client.on(CryptoEvent.VerificationRequest, this.handleVerification.bind(this));

			this.client.on(RoomMemberEvent.Membership, this.membershipHandler.bind(this));

			this.client.on(RoomEvent.Timeline, async (e: MatrixEvent, room: Room) => {
				if (e.isEncrypted()) await this.messageHandler(room.roomId, e);
			});
			this.client.on(ClientEvent.Sync, async (state, lastState, data) => {
				if(state === 'PREPARED'){
					await this.client.uploadKeys();
					await this.refreshDMRooms();
					console.log('Client started.');
				}
			});
			
		} catch(e){
			console.log('Unable to start client: ' + e);
		}
	}

	async findSpaceByName(name: string){
		const rooms = this.client.getRooms();
		for(const r of rooms) if(r.isSpaceRoom() && r.name === name) return r;
		return null;
	}

	async findRoomsInSpace(space: string){
		const room = await this.findSpaceByName(space);
		if(!room) return null;
		let rooms = [];
		const roomStates = await this.client.roomState(room.roomId);
		for(const r of roomStates){
			if(r.type === EventType.SpaceChild) rooms.push(r.state_key);
		}
		return rooms;
	}

	async findOrCreateRoomInSpace(space: string, name: string){
		const room = await this.findSpaceByName(space);
		if(!room) return null;
		const roomStates = await this.client.roomState(room.roomId);
		for(const r of roomStates){
			if(r.type === EventType.SpaceChild) {
				const child = this.client.getRoom(r.state_key);
				if(!child) continue;
				if(child.name === name) return child.roomId;
			}
		}
		return await this.createSubRoom(name, room.roomId, false, false);
	}

	async sendVerification(userId: string){
		const req = await this.client.requestVerification(userId);
		req.on(VerificationRequestEvent.Change, () => this.handleVerification(req));
	}

	async handleVerification(req: VerificationRequest) {
		/**
		 * Change CrossSigning.js to make this work without error:
		 * if (!this.callbacks.getCrossSigningKey) { -> if (!shouldCache && !this.callbacks.getCrossSigningKey) {
		 */
		if(req.phase === 3){
			req.beginKeyVerification(verificationMethods.SAS);
			return;
		} else if(req.phase === 4){
			try {
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
				await req.verifier.verify();
				console.log('Verification complete.');
			} catch (err) {
				console.debug(err);
			}
		}
	}

	async isUserVerified(userId: string): Promise<boolean>{
		const devices = this.client.getStoredDevicesForUser(userId);
		for(const d of devices) if(d.isUnverified()) return false;
		return true;
	}

	/**
	 * @return {number} 0: Room has encryption enabled, and everyone in the room is verified.
	 * @return {number} 1: Room does not exist.
	 * @return {number} 2: Room does not have encryption enabled.
	 * @return {number} 3: Room has unverified devices. Check unverified property.
	 */

	async isRoomSafe(roomId: string): Promise<RoomSecurity>{
		const room = this.client.getRoom(roomId);
		if (room === null) return {res: 1};
		if (!this.client.isRoomEncrypted(roomId)) return {res: 2};
		const members = await room.getEncryptionTargetMembers();
		let unverified = [];
		let verified = [];
		for(const m of members) {
			if(!(await this.isUserVerified(m.userId))) unverified.push(m.userId);
			else verified.push(m.userId);
		}
		if(unverified.length) return {res: 3, unverified: unverified, verified: verified};
		return {res: 0};
	}

	async sendMessage(roomId: string, message: string){ //Must not throw errors
		try{
			const security = await this.isRoomSafe(roomId);
			if (security.res) {
				if(security.res === 3) {
					let errMsg = `Message was not sent to ${roomId} because there were unverified users.\nUnverified users:\n${security.unverified.join('\n')}\nOriginal message: \n${message}`;
					for(const v of security.verified) this.sendDM(v, errMsg);
					for(const u of security.unverified) this.sendVerification(u);
				}
				return;
			}
			await this.client.sendMessage(roomId, {
				body: message,
				msgtype: 'm.text',
			});
			console.log(`Message sent to ${roomId}, content: ${message}.`);
		} catch(e){
			console.log(187, e);
		}
	}

	async createSpace(name: string, sender: string, priv: boolean){
		try{
			await this.client.createRoom({
				visibility: priv ? Visibility.Private : Visibility.Public,
				name: name,
				invite: [sender],
				preset: Preset.TrustedPrivateChat,
				creation_content: {
					[RoomCreateTypeField]: RoomType.Space
				}
			});
		}catch(e){
			console.log(e)
		}
	}

	async createSubRoom(name: string, parent: string, suggest: boolean, autoJoin: boolean){
		try{
			const roomId = await this.client.createRoom({
				visibility: Visibility.Public,
				name: name,
				room_version: '9',
				preset: Preset.PublicChat,
				initial_state: [
					{
						type: EventType.SpaceParent,
						state_key: parent,
						content: {
							via: [this.domain],
							canonical: true
						}
					},
					{
						type: EventType.RoomJoinRules,
						content: {
							join_rule: JoinRule.Restricted,
    						allow: [
      							{
        							type: RestrictedAllowType.RoomMembership,
        							room_id: parent
      							}
    						]
						}
					}
				]
			});
			await this.client.sendStateEvent(parent, EventType.SpaceChild, {
				suggested: suggest,
        		auto_join: autoJoin,
				via: [this.domain],
			}, roomId.room_id);
			return roomId.room_id;
		} catch (e) { 
			console.log(e)
			return null;
		}
	}

	async refreshDMRooms(){
		const accountData = this.client.getAccountData('m.direct');
		if(!accountData) return;
		const dmMap = accountData.getContent();
		for(const u in dmMap){
			for(const r of dmMap[u]){
				const room = this.client.getRoom(r);
				if (room) this.dmRooms[u] = r;
			}
		}
	}

	async sendDM(userId: string, message: string){
		if(userId === this.userId) return;
		let room = this.dmRooms[userId];
		try{
			if(!room){
				const roomId = await this.client.createRoom({preset: Preset.TrustedPrivateChat, invite: [userId], is_direct: true});
				this.dmRooms[userId] = roomId.room_id;
				room = roomId.room_id;
			}
			const security = await this.isRoomSafe(room);
			if (security.res) {
				if(security.res === 3) for(const u of security.unverified) await this.sendVerification(u);
				return;
			}
			await this.client.sendMessage(room, {
				body: message,
				msgtype: 'm.text',
			});
		} catch(e) {
			if(e instanceof UnknownDeviceError){
				console.log(`Room ${room} has unverified devices.`);
			}
			console.log(e);
		}
	}

	async membershipHandler (e: sdk.MatrixEvent, m: sdk.RoomMember, o: string | null) {
		if (m.membership === 'invite' && m.userId === this.userId) {
			await this.client.joinRoom(m.roomId);
			await this.refreshDMRooms();
			console.log(`Successfully joined ${m.roomId}.`);
		}
	}

	async messageHandler(roomId: string, data: MatrixEvent){
		if (data.isRedacted()) return;
		if (data.sender.userId === this.userId) return;
		try{
			const e = await this.client.crypto.decryptEvent(data);
			if(e.clearEvent.content.msgtype === MsgType.KeyVerificationRequest) return;
			const cmd = (e.clearEvent.content.body as string).split(' ');
			//if(cmd[0] === 'test') this.createSubRoom('Take6', data.sender.userId, '!brvTWpTACzvFeVwNYi:skew.ch', false, false);
			if(cmd[0] === 'echo') this.sendMessage(roomId, cmd[1]);
			if(cmd[0] === 'invalidate') {
				await this.client.setDeviceVerified(data.sender.userId, data.getContent().device_id, false);
			}
			if(cmd[0] === 'debug') await this.sendMessage(roomId, await Command.debug(this.client, this.client.getRoom(roomId)));
			if(cmd[0] === 'create'){
				if(cmd[1] === 'space'){
					await this.createSpace(cmd[2], data.sender.userId, true);
					return;
				}
			}
		} catch(err){
			if(err instanceof DecryptionError && err.code === 'MEGOLM_UNKNOWN_INBOUND_SESSION_ID') await this.sendMessage(roomId, 'Re-creating new secure channel. Please try again.');
			else {
				console.log('Error handling message: ');
				console.log(err)
			}
		}
	}
}