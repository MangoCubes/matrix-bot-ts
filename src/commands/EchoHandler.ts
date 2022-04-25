import Command from "../class/Command";
import CommandHandler from "./CommandHandler";

export default class EchoHandler extends CommandHandler{
	async handleMessage(command: Command, sender: string, roomId: string): Promise<void> {
		if(command.getName() !== this.prefix) return;
		const rest = command.command.slice(1);
		await this.client.sendMessage(roomId, rest.join(' '));
	}
}