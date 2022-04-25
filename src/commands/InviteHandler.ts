import Command from "../class/Command";
import CommandHandler from "./CommandHandler";

export default class InviteHandler extends CommandHandler{
	async handleMessage(command: Command, sender: string, roomId: string): Promise<boolean> {
		if(command.getName() !== this.prefix) return false;
		await this.client.invite(sender);
		return true;
	}
}