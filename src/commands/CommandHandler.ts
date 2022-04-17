import { IClearEvent, MatrixEvent } from "matrix-js-sdk";
import Client from "../Client";

export default abstract class CommandHandler{
	readonly prefix: string;
	readonly client: Client;
	constructor(client: Client, prefix: string){
		this.prefix = prefix;
		this.client = client;
	}
	abstract onMessage(command: string[], event: MatrixEvent, clear: IClearEvent): Promise<void>;
}