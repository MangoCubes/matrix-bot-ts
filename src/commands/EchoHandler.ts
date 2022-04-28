import Command from "../class/Command";
import CommandHandler from "./CommandHandler";

export default class EchoHandler extends CommandHandler{
	async handleMessage(command: Command, sender: string, roomId: string): Promise<boolean> {
		if(command.getName() !== this.prefix) return false;
		const rest = command.getOptions();
		await this.client.sendMessage(roomId, rest.join(' '));
		return true;
	}
}