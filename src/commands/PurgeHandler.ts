import Command from "../class/Command";
import Client from "../Client";
import CommandHandler from "./CommandHandler";

export default class InviteHandler extends CommandHandler{
	inProgress: {[roomId: string]: string};
	constructor(client: Client, prefix: string){
		super(client, prefix);
		this.inProgress = {};
	}
	async handleMessage(command: Command, sender: string, roomId: string): Promise<void> {
		if(command.getName() === 'yes' && this.inProgress[roomId] === sender){
			await this.client.sendMessage(roomId, 'Confirmed.');
			delete this.inProgress[roomId];
			await this.client.deleteRoom(roomId);
		} else {
			let cancelled = false;
			if(this.inProgress[roomId]) {
				delete this.inProgress[roomId];
				cancelled = true;
			}
			if (command.getName() === this.prefix){
				this.inProgress[roomId] = sender;
				await this.client.sendMessage(roomId, 'Are you sure you want to purge this room? Please type \'yes\' to confirm.');
			} else if (cancelled) await this.client.sendMessage(roomId, 'Purge cancelled.');
		}
	}
}