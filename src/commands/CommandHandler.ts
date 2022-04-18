import { IClearEvent, MatrixEvent } from "matrix-js-sdk";
import MessageError from "../class/error/MessageError";
import Client from "../Client";

export default abstract class CommandHandler{
	readonly prefix: string;
	readonly client: Client;
	constructor(client: Client, prefix: string){
		this.prefix = prefix;
		this.client = client;
	}
	async onMessage(command: string[], event: MatrixEvent, clear: IClearEvent): Promise<void>{
		try{
			if(!event.getRoomId()) return;
			await this.handleMessage(command, event, clear); //Try sending message back
		} catch (e) {
			if(e instanceof MessageError) console.log(e); //If sending fails, print error
			else try{
				await this.client.sendDM(event.getSender(), JSON.stringify(e)); //If not, try sending error back
			} catch(e) {
				console.log(e); //If that fails, print error instead
			}
		}
		
	}
	abstract handleMessage(command: readonly string[], event: MatrixEvent, clear: IClearEvent): Promise<void>;
}