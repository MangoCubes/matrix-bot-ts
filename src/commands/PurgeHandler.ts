import { MatrixEvent, IClearEvent } from "matrix-js-sdk";
import Client from "../Client";
import CommandHandler from "./CommandHandler";

export default class InviteHandler extends CommandHandler{
	inProgress: {[roomId: string]: string};
	constructor(client: Client, prefix: string){
		super(client, prefix);
		this.inProgress = {};
	}
	async handleMessage(command: readonly string[], sender: string, roomId: string): Promise<void> {
		if(command[0] === 'yes' && this.inProgress[roomId] === sender){
			await this.client.sendMessage(roomId, 'Confirmed.');
			delete this.inProgress[roomId];
			await this.client.deleteRoom(roomId);
		} else {
			let cancelled = false;
			if(this.inProgress[roomId]) {
				delete this.inProgress[roomId];
				cancelled = true;
			}
			if (command[0] === this.prefix){
				this.inProgress[roomId] = sender;
				await this.client.sendMessage(roomId, 'Are you sure you want to purge this room? Please type \'yes\' to confirm.');
			} else if (cancelled) await this.client.sendMessage(roomId, 'Purge cancelled.');
		}
	}
}