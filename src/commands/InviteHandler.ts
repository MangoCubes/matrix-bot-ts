import Command from "../class/Command";
import CommandHandler from "./CommandHandler";

export default class InviteHandler extends CommandHandler{
	async handleMessage(command: Command, sender: string, roomId: string): Promise<void> {
		if(command.getName() !== this.prefix) return;
		await this.client.invite(sender);
	}
}