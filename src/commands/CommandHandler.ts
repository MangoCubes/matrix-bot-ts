import { IClearEvent, MatrixEvent } from "matrix-js-sdk";
import Client from "../Client";

export default abstract class CommandHandler{
	prefix: string;
	client: Client;
	constructor(client: Client, prefix: string){
		this.prefix = prefix;
		this.client = client;
	}

	handles(message: string){
		return message === this.prefix;
	}

	abstract respond(command: string[], event: MatrixEvent, clear: IClearEvent): Promise<void>;
}