import { MatrixEvent, IClearEvent } from "matrix-js-sdk";
import Client from "../Client";
import CommandHandler from "./CommandHandler";

export default class InviteHandler extends CommandHandler{
	inProgress: {[roomId: string]: string};
	constructor(client: Client, prefix: string){
		super(client, prefix);
		this.inProgress = {};
	}
	async onMessage(command: string[], event: MatrixEvent, clear: IClearEvent): Promise<void> {
		try{
			if(!clear.room_id) return;
			if(command[0] === 'yes' && this.inProgress[clear.room_id] === event.getSender()){
				await this.client.sendMessage(clear.room_id, 'Confirmed.');
				delete this.inProgress[clear.room_id];
				await this.client.deleteRoom(clear.room_id);
			} else {
				let cancelled = false;
				if(this.inProgress[clear.room_id]) {
					delete this.inProgress[clear.room_id];
					cancelled = true;
				}
				if (command[0] === this.prefix){
					this.inProgress[clear.room_id] = event.getSender();
					await this.client.sendMessage(clear.room_id, 'Are you sure you want to purge this room? Please type \'yes\' to confirm.');
				} else if (cancelled) await this.client.sendMessage(clear.room_id, 'Purge cancelled.');
			}
		} catch (e) {
			console.log(e);
		}
	}
}