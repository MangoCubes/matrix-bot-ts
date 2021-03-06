import { readFileSync } from 'fs';
import sdk, { ClientEvent, EventType, JoinRule, MatrixError, MatrixEvent, MemoryCryptoStore, MsgType, Preset, RelationType, RestrictedAllowType, Room, RoomCreateTypeField, RoomEvent, RoomMemberEvent, RoomType, Visibility } from 'matrix-js-sdk';
import { DecryptionError } from 'matrix-js-sdk/lib/crypto/algorithms';
import { LocalStorageCryptoStore } from 'matrix-js-sdk/lib/crypto/store/localStorage-crypto-store';
import { LocalStorage } from 'node-localstorage';
import MessageError from './class/error/MessageError';
import CommandHandler from './commands/CommandHandler';
import DebugHandler from './commands/DebugHandler';
import EchoHandler from './commands/EchoHandler';
import InviteHandler from './commands/InviteHandler';
import PurgeHandler from './commands/PurgeHandler';
import { ConfigFile } from './generateConfig';
import TrustedHandler from './commands/TrustedHandler';
import LockHandler from './commands/LockHandler';
import AliasHandler from './commands/AliasHandler';
import Command, { ParsingError } from './class/Command';
import CurlHandler from './commands/CurlHandler';
import SQLite from './database/SQLite';
import RSSHandler from './commands/RSSHandler';
import Task from './tasks/Task';
import FetchRSS from './tasks/FetchRSS';


type RoomCreationOptions = {
	showHistory: boolean;
}

type RoomSecurity = {res: 0 | 1 | 2} | {res: 3, unverified: string[], verified: string[]};

export default class Client{
	client: sdk.MatrixClient;
	config: ConfigFile;
	debugMode: boolean;
	dmRooms: {[uid: string]: string};
	handlers: CommandHandler[];
	configDir: string;
	trustedDir: string;
	lock: {[roomId: string]: {
		[userId: string]: string;
	}}
	db: SQLite;
	tasks: Task[];
	customTasks: {[uid: string]: Task[]};
	constructor(configDir: string, trustedDir: string, debugMode?: boolean){
		this.configDir = configDir;
		this.trustedDir = trustedDir;
		const config = JSON.parse(readFileSync(configDir, 'utf8'));
		this.config = {
			serverUrl: config.configUrl,
			accessToken: config.accessToken,
			storage: config.storage,
			userId: config.userId,
			deviceId: config.deviceId,
			logRoom: config.logRoom,
			serverName: config.serverName
		}
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
			verificationMethods: ['m.sas.v1']
		});
		this.dmRooms = {};
		this.db = new SQLite('./config/sqlite.db');
		this.db.init();
		this.handlers = [
			new DebugHandler(this, '!debug', ),
			new EchoHandler(this, '!echo'),
			new InviteHandler(this, '!invite'),
			new PurgeHandler(this, '!purge'),
			new TrustedHandler(this, '!trust'),
			new LockHandler(this, '!lock'),
			new CurlHandler(this, '!curl'),
			new RSSHandler(this, '!rss'),

			/* Make sure AliasHandler is last to make sure it catches something that didn't trigger any commands.*/
			new AliasHandler(this, '!alias', './config/commands/alias.json'),
		];
		this.tasks = [];
		this.customTasks = {};
		this.lock = {};
	}

	async init(){
		this.tasks = [
			new FetchRSS(this, 'RSS', 10)
		];
		for(const t of this.tasks) await t.loadTask();
		for(const t of this.tasks) t.startTask();
		//this.client.pickleKey = await createPickleKey(this.client.getUserId(), this.client.getDeviceId());
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
				await this.leaveEmptyRooms();
				await this.refreshDMRooms();
				console.log('Client started.');
			}
		});
	}

	async leaveEmptyRooms(){
		const rooms = this.client.getRooms();
		for(const r of rooms){
			const invited = r.getInvitedAndJoinedMemberCount();
			if (invited === 1) await this.client.leave(r.roomId);
		}
	}

	async findRoomByDir(dir: string[], createIfNotExists: null | RoomCreationOptions): Promise<{isNew: boolean, roomId: string} | null>{
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
						if(e instanceof MatrixError){
							if(e.errcode === 'M_UNKNOWN') continue;
							else throw e;
						}
					}
				}
				if(roomDict[r] && roomDict[r].name === dir[i]){ //Room is found
					if (isLast) return {
						isNew: false,
						roomId: r
					};
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
					const newRoom: string = await this.createSubRoom(dir[i], parent, false, true, !isLast, createIfNotExists.showHistory);
					if (isLast) return {
						isNew: true,
						roomId: newRoom
					};
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
	async findRoomInSpace(space: string, name: string, createIfNotExists: null | RoomCreationOptions){
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
		return createIfNotExists ? await this.createSubRoom(name, room.roomId, false, true, false, createIfNotExists.showHistory) : null;
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

	async sendMessage(roomId: string, message: string){
		const security = await this.isRoomSafe(roomId);
		if (security.res) {
			return;
		}
		try{
			if(message.length === 0) message = '<Empty>';
			await this.client.sendMessage(roomId, {
				body: message,
				msgtype: 'm.text',
			});
		} catch (e) {
			console.log(e)
			throw new MessageError(roomId, false);
		}
	}

	async invite(userId: string){
		const mainRoom = await this.findRoomByDir([this.config.userId], {showHistory: false});
		if(!mainRoom) return;
		await this.client.invite(mainRoom.roomId, userId);
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

	async createSubRoom(name: string, parent: string | null, suggest: boolean, autoJoin: boolean, isSpace: boolean, showAll: boolean){
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
						via: [this.config.serverName],
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
		if(showAll) options.initial_state!.push(
			{
				type: EventType.RoomHistoryVisibility,
				content: {
					history_visibility: 'shared'
				}
			}
		)
		const roomId = await this.client.createRoom(options);
		await this.client.sendStateEvent(parent, EventType.SpaceChild, {
			suggested: suggest,
        	auto_join: autoJoin,
			via: [this.config.serverName],
		}, roomId.room_id);
		return roomId.room_id;
	}

	async refreshDMRooms(){
		const dmData = this.client.getAccountData(EventType.Direct);
		if(!dmData) return;
		const content: {[uid: string]: string[]} = dmData.getContent();
		for(const u in content){
			if (content[u].length) this.dmRooms[u] = content[u][0];
		}
	}

	async deleteRoom(roomId: string){
		const users = await this.client.getJoinedRoomMembers(roomId);
		for(const u of Object.keys(users.joined)) {
			if(u !== this.config.userId) await this.client.kick(roomId, u, 'Purging room.');
		}
		await this.client.leave(roomId);
	}

	async sendDM(userId: string, message: string){
		if(userId === this.config.userId) return;
		let room = this.dmRooms[userId];
		if(!room){
			// As per https://spec.matrix.org/latest/client-server-api/#client-behaviour-21, I must set m.direct myself.
			const createRoom = await this.client.createRoom({preset: Preset.TrustedPrivateChat, invite: [userId], is_direct: true});
			room = createRoom.room_id;
			const accountData = this.client.getAccountData(EventType.Direct);
			let dmRooms: {[userId: string]: string[]} = {};
			if(accountData) dmRooms = accountData.getContent();
			if(!dmRooms[userId]) dmRooms[userId] = [room];
			else dmRooms[userId].push(room);
			await this.client.setAccountData(EventType.Direct, dmRooms);
			this.dmRooms[userId] = room;
		}
		const security = await this.isRoomSafe(room);
		if (security.res) {
			console.log(security);
			return;
		}
		try{
			await this.client.sendMessage(room, {
				body: message,
				msgtype: 'm.text',
			});
		} catch (e) {
			console.log(e)
			throw new MessageError(room, true);
		}
	}

	async membershipHandler (e: sdk.MatrixEvent, m: sdk.RoomMember, o: string | null) {
		try{
			if (m.membership === 'invite' && m.userId === this.config.userId) {
				await this.client.joinRoom(m.roomId);
				if(e.getContent().is_direct){
					const accountData = this.client.getAccountData(EventType.Direct);
					let dmRooms: {[userId: string]: string[]} = {};
					if(accountData) dmRooms = accountData.getContent();
					if(!dmRooms[e.getSender()]) dmRooms[e.getSender()] = [m.roomId];
					else dmRooms[e.getSender()].push(m.roomId);
					await this.client.setAccountData(EventType.Direct, dmRooms);
					this.dmRooms[e.getSender()] = m.roomId;
				}
			}
		} catch(e) {
			console.log(e);
		}
	}

	async sendErrorMessage(roomId: string, message: string){
		try{
			await this.sendMessage(roomId, message);
		} catch(e){
			console.log('(-) Failed to send message.');
		}
	}

	async sendErrorDM(userId: string, message: string){
		try{
			await this.sendDM(userId, message);
		} catch(e){
			console.log('(-) Failed to send private message.');
		}
	}

	async messageHandler(roomId: string, data: MatrixEvent){
		if (data.isRedacted()) return;
		if (data.sender.userId === this.config.userId) return;
		if (!await this.db.isTrusted(data.sender.userId)) return;
		try{
			const e = await this.client.crypto.decryptEvent(data);
			if(e.clearEvent.content.msgtype === MsgType.KeyVerificationRequest) return;
			const roomId = data.getRoomId();
			if(!roomId) return;
			const cmd = new Command(e.clearEvent.content.body as string, data.event.event_id, []);
			await this.handleCommand(cmd, data.getSender(), roomId);
		} catch(err){
			if(err instanceof DecryptionError && err.code === 'MEGOLM_UNKNOWN_INBOUND_SESSION_ID') await this.sendErrorMessage(roomId, 'Re-creating new secure channel. Please try again.');
			else if(err instanceof ParsingError) await this.sendErrorMessage(roomId, err.message);
			else {
				console.log('Error handling message: ');
				console.log(err)
			}
		}
	}
	
	async lockCommands(userId: string, roomId: string, to: string){
		if(!this.lock[roomId]) this.lock[roomId] = {};
		this.lock[roomId][userId] = to;
	}

	async unlockCommands(userId: string, roomId: string){
		if(!this.lock[roomId]) this.lock[roomId] = {};
		delete this.lock[roomId][userId];
	}

	async getLock(userId: string, roomId: string){
		if(!this.lock[roomId]) {
			this.lock[roomId] = {};
			return false;
		} else return this.lock[roomId][userId] ? this.lock[roomId][userId] : null;
	}

	async handleCommand(message: Command, sender: string, roomId: string): Promise<boolean>{
		for(const h of this.handlers) {
			if(message.ignore.includes(h.cid)) continue;
			if(await h.onMessage(message, sender, roomId)) return true;
		}
		return false;
	}

	async sendReaction(roomId: string, msgId: string, emoji: string){
		await this.client.sendEvent(roomId, EventType.Reaction, {
			"m.relates_to": {
				rel_type: RelationType.Annotation,
				event_id: msgId,
				key: emoji
			}
		})
	}
}