import MessageError from "../class/error/MessageError";
import Client from "../Client";

export default abstract class CommandHandler{
	readonly prefix: string;
	readonly client: Client;
	constructor(client: Client, prefix: string){
		this.prefix = prefix;
		this.client = client;
	}
	async onMessage(command: string[], sender: string, roomId: string): Promise<void>{
		try{
			await this.handleMessage(command, sender, roomId); //Try sending message back
		} catch (e) {
			if(e instanceof MessageError) console.log(e); //If sending fails, print error
			else try{
				await this.client.sendDM(sender, JSON.stringify((e as Error).stack)); //If not, try sending error back
			} catch(e) {
				console.log(e); //If that fails, print error instead
			}
		}
		
	}
	abstract handleMessage(command: readonly string[], sender: string, roomId: string): Promise<void>;
}