import MessageError from "../class/error/MessageError";
import Client from "../Client";
import crypto from 'crypto';
import Command from "../class/Command";

interface Config{
	ignoreLock?: boolean;
}

export default abstract class CommandHandler{
	readonly prefix: string;
	readonly client: Client;
	readonly cid: string;
	readonly options: Config;
	constructor(client: Client, prefix: string, options?: Config){
		this.prefix = prefix;
		this.client = client;
		this.cid = crypto.randomUUID();
		this.options = options ? options : {};
	}
	async onMessage(command: Command, sender: string, roomId: string): Promise<boolean>{
		if(!this.options.ignoreLock){
			if(!this.client.lock[roomId]){
				this.client.lock[roomId] = {};
				return false;
			}
			if(this.client.lock[roomId][sender] && this.cid !== this.client.lock[roomId][sender]) return false;
		}
		try{
			return await this.handleMessage(command, sender, roomId); //Try sending message back
		} catch (e) {
			if(e instanceof MessageError) console.log(e); //If sending fails, print error
			else await this.client.sendErrorDM(sender, JSON.stringify((e as Error).stack));
			return false;
		}
		
	}
	abstract handleMessage(command: Command, sender: string, roomId: string): Promise<boolean>;
}