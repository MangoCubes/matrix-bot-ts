import { readFileSync } from 'fs';
import sdk, { ClientEvent, EventType, JoinRule, MatrixEvent, MemoryCryptoStore, MsgType, Preset, RestrictedAllowType, Room, RoomCreateTypeField, RoomEvent, RoomMemberEvent, RoomType, Visibility } from 'matrix-js-sdk';
import { DecryptionError } from 'matrix-js-sdk/lib/crypto/algorithms';
import { LocalStorageCryptoStore } from 'matrix-js-sdk/lib/crypto/store/localStorage-crypto-store';
import { LocalStorage } from 'node-localstorage';
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
	serverName: string;
	constructor(configDir: string, debugMode?: boolean){
		const config = JSON.parse(readFileSync(configDir, 'utf8'));
		const cryptoStore = new LocalStorageCryptoStore(new LocalStorage(config.storage));
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
		this.serverName = config.serverName;
		this.dmRooms = {};
	}

	async init(){
		await this.client.initCrypto();
		await this.client.startClient({ initialSyncLimit: 0 });
		this.client.setGlobalErrorOnUnknownDevices(false);
		
		if(!this.client.isCryptoEnabled()){
			console.log('Crypto not enabled. Quitting.');
			process.exit(1);
		}
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
	}

	async findRoomByDir(dir: string[], createIfNotExists: boolean){
		const rooms = this.client.getRooms();
		let roomDict: {[roomId: string]: sdk.Room} = {};
		let currentRooms = await this.getRootSpaces();
		let parent: string | null = null;
		for (const r of rooms) roomDict[r.roomId] = r;
		for (let i = 0; i < dir.length; i++) {
			const isLast = i === dir.length - 1;
			let found = false;
			for(const r of currentRooms){
				if (!roomDict[r]) { //Room exists, but bot has not joined
					try{
						const room = await this.client.joinRoom(r);
						roomDict[r] = room;
					} catch (e) {
						if(e.errcode === 'M_UNKNOWN') continue;
						else throw e;
					}
				}
				if(roomDict[r] && roomDict[r].name === dir[i]){ //Room is found
					if (isLast) return r;
					const children = await this.findRoomsInSpace(r);
					if (!children) return null;
					currentRooms = children;
					parent = r;
					found = true;
					break;
				}
			}
			if (!found) {
				if(createIfNotExists) { //Room with given name is not found
					const newRoom: string = await this.createSubRoom(dir[i], parent, false, false, !isLast);
					if (isLast) return newRoom;
					roomDict[newRoom] = await this.client.joinRoom(newRoom);
					currentRooms = [];
					parent = newRoom;
				} else return null;
			}
		}
		return null;
	}

	async getRootSpaces(){
		const rooms = this.client.getRooms();
		let rootSpaces = [];
		for(const r of rooms){
			if (!r.isSpaceRoom()) continue;
			const roomStates = await this.client.roomState(r.roomId);
			let isRoot = true;
			for(const s of roomStates){
				if(s.type === EventType.SpaceParent) {
					isRoot = false;
					break;
				}
			}
			if (isRoot) rootSpaces.push(r.roomId);
		}
		return rootSpaces;
	}

	/**
	 * Finds all rooms in space
	 * @param space ID of the space
	 * @returns Room IDs
	 */
	async findRoomsInSpace(space: string){
		const room = this.client.getRoom(space);
		if(!room) return null;
		let rooms = [];
		const roomStates = await this.client.roomState(room.roomId);
		for(const r of roomStates){
			if(r.type === EventType.SpaceChild) rooms.push(r.state_key);
		}
		return rooms;
	}

	/**
	 * Find rooms if it exists, or create one within it
	 * @param space ID of the space
	 * @param name Name of the room 
	 * @returns Room ID, whether it's created or found
	 */
	async findRoomInSpace(space: string, name: string, createIfNotExists: boolean){
		const room = this.client.getRoom(space);
		if(!room) return null;
		const roomStates = await this.client.roomState(room.roomId);
		for(const r of roomStates){
			if(r.type === EventType.SpaceChild) {
				const child = this.client.getRoom(r.state_key);
				if(!child) continue;
				if(child.name === name) return child.roomId;
			}
		}
		return createIfNotExists ? await this.createSubRoom(name, room.roomId, false, false, false) : null;
	}

	async isUserVerified(userId: string): Promise<boolean>{
		const devices = this.client.getStoredDevicesForUser(userId);
		for(const d of devices) if(d.isUnverified()) return false;
		return true;
	}

	/**
	 * @return {number} 0: Room has encryption enabled.
	 * @return {number} 1: Room does not exist.
	 * @return {number} 2: Room does not have encryption enabled.
	 * @return {number} 3: Room has unverified devices. Check unverified property. Not used until I figure out how XS works.
	 */

	async isRoomSafe(roomId: string): Promise<RoomSecurity>{
		const room = this.client.getRoom(roomId);
		if (room === null) return {res: 1};
		if (!this.client.isRoomEncrypted(roomId)) return {res: 2};
		return {res: 0};
	}

	async sendMessage(roomId: string, message: string, ){ //Must not throw errors
		const security = await this.isRoomSafe(roomId);
		if (security.res) {
			console.log(security);
			return;
		}
		await this.client.sendMessage(roomId, {
			body: message,
			msgtype: 'm.text',
		});
	}

	async createSpace(name: string){
		return (await this.client.createRoom({
			visibility: Visibility.Public,
			name: name,
			creation_content: {
				[RoomCreateTypeField]: RoomType.Space
			}
		})).room_id;
	}

	async createSubRoom(name: string, parent: string | null, suggest: boolean, autoJoin: boolean, isSpace: boolean){
		if(!parent) return await this.createSpace(name);
		let options: sdk.ICreateRoomOpts = {
			visibility: Visibility.Public,
			name: name,
			room_version: '9',
			preset: Preset.PublicChat,
			initial_state: [
				{
					type: EventType.SpaceParent,
					state_key: parent,
					content: {
						via: [this.serverName],
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
		}
		if(isSpace) options.creation_content = {
			[RoomCreateTypeField]: RoomType.Space
		}
		const roomId = await this.client.createRoom(options);
		await this.client.sendStateEvent(parent, EventType.SpaceChild, {
			suggested: suggest,
        	auto_join: autoJoin,
			via: [this.serverName],
		}, roomId.room_id);
		return roomId.room_id;
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
		if(!room){
			const roomId = await this.client.createRoom({preset: Preset.TrustedPrivateChat, invite: [userId], is_direct: true});
			this.dmRooms[userId] = roomId.room_id;
			room = roomId.room_id;
		}
		const security = await this.isRoomSafe(room);
		if (security.res) {
			console.log(security);
			return;
		}
		await this.client.sendMessage(room, {
			body: message,
			msgtype: 'm.text',
		});
	}

	async membershipHandler (e: sdk.MatrixEvent, m: sdk.RoomMember, o: string | null) {
		try{
			if (m.membership === 'invite' && m.userId === this.userId) {
				await this.client.joinRoom(m.roomId);
				await this.refreshDMRooms();
			}
		} catch(e) {
			console.log(e);
		}
	}

	async messageHandler(roomId: string, data: MatrixEvent){
		if (data.isRedacted()) return;
		if (data.sender.userId === this.userId) return;
		try{
			const e = await this.client.crypto.decryptEvent(data);
			if(e.clearEvent.content.msgtype === MsgType.KeyVerificationRequest) return;
			const cmd = (e.clearEvent.content.body as string).split(' ');
			if(cmd[0] === 'echo') this.sendMessage(roomId, cmd[1]);
			if(cmd[0] === 'invalidate') {
				await this.client.setDeviceVerified(data.sender.userId, data.getContent().device_id, false);
			}
			if(cmd[0] === 'debug') await this.sendMessage(roomId, await Command.debug(this.client, this.client.getRoom(roomId)));
			if(cmd[0] === 'create'){
				if(cmd[1] === 'space'){
					await this.createSpace(cmd[2]);
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