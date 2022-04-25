import yargs from "yargs/yargs";
import Command from "../class/Command";
import CommandHandler from "./CommandHandler";

export default class DebugHandler extends CommandHandler{
	async handleMessage(command: Command, sender: string, roomId: string): Promise<void> {
		if(command.getName() !== this.prefix) return;
		const cmd = yargs().help(false).exitProcess(false).command(['add', 'a'], 'Add new trusted users', async (cmd) => {
			cmd.option('o', {
				alias: 'overwrite',
				type: 'boolean'
			});
			const args = await cmd.parseAsync(command.command.slice(2));
			console.log(args);
		}).command(['remove', 'r'], 'Remove trusted users', async (cmd) => {
			const args = await cmd.parseAsync(command.command.slice(2));
			console.log(args);
		}).command(['list', 'ls'], 'List trusted users', async (cmd) => {
			await this.client.sendMessage(roomId, 'List of trusted users:\n' + this.client.trusted.trusted.join('\n'));
		}).option('h', {
			alias: 'help',
			type: 'boolean',
		});
		const args = await cmd.parseAsync(command.command.slice(1));
		if(args.h){
			await this.client.sendMessage(roomId, await cmd.getHelp());
			return;
		}
	}
}