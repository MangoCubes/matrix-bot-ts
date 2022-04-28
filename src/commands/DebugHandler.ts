import yargs from "yargs/yargs";
import Command from "../class/Command";
import CommandHandler from "./CommandHandler";

export default class DebugHandler extends CommandHandler{
	async handleMessage(command: Command, sender: string, roomId: string): Promise<boolean> {
		console.log(command)
		if(command.getName() !== this.prefix) return false;
		const args = await yargs().parseAsync(command.getOptions().options);
		await this.client.sendMessage(roomId, JSON.stringify(args, null, 4));
		return false;
	}
}