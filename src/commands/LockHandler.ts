import yargs from "yargs/yargs";
import CommandHandler from "./CommandHandler";

export default class EchoHandler extends CommandHandler{
	async handleMessage(command: readonly string[], sender: string, roomId: string): Promise<void> {
		if(command[0] !== this.prefix) return;
		const args = yargs(command.slice(1)).string(['_']).version(false).help(false).exitProcess(false).showHelpOnFail(false).options({
			lock: {type: 'boolean', alias: 'l'}
		}).parseSync();
		if(args.lock) await this.client.lockCommands(sender, roomId);
		else await this.client.unlockCommands(sender, roomId);
		await this.client.sendMessage(roomId, `You have been ${args.lock ? '' : 'un'}locked.`);
	}
}