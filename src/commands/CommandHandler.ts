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
			await this.handleMessage(command, event, clear);
		} catch (e) {
			if(e instanceof MessageError) console.log(e);
			else try{
				await this.client.sendDM(event.getSender(), JSON.stringify(e));
			} catch(e) {
				console.log(e);
			}
		}
		
	}
	abstract handleMessage(command: string[], event: MatrixEvent, clear: IClearEvent): Promise<void>;
}