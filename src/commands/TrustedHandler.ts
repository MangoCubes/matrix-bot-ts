import yargs from "yargs/yargs";
import Command from "../class/Command";
import CommandHandler from "./CommandHandler";

export default class TrustedHandler extends CommandHandler{
	async handleMessage(command: Command, sender: string, roomId: string): Promise<boolean> {
		if(command.getName() !== this.prefix) return false;
		let handled = false;
		const cmd = yargs().scriptName('!trust').help(false).version(false).exitProcess(false).command(['add', 'a'], 'Add new trusted users', async (cmd) => {
			handled = true;
			const args = await cmd.string(['_']).parseAsync(command.command.slice(2));
			const input = this.normaliseNames(args._);
			await this.client.db.addTrustedUser(input);
			await this.client.sendMessage(roomId, `The following users have been added to the trusted list:\n${input.join('\n')}`);
		}).command(['remove', 'r', 'rm', 'del'], 'Remove trusted users', async (cmd) => {
			handled = true;
			const args = await cmd.parseAsync(command.command.slice(2));
			const input = this.normaliseNames(args._);
			await this.client.db.removeTrustedUser(input);
			await this.client.sendMessage(roomId, `The following users have been removed to the trusted list:\n${input.join('\n')}`);
		}).command(['list', 'ls'], 'List trusted users', async (cmd) => {
			handled = true;
			await this.client.sendMessage(roomId, 'List of trusted users:\n' + (await this.client.db.getTrusted()).join('\n'));
		}).showHelpOnFail(false).option('h', {
			alias: 'help',
			type: 'boolean',
		});
		try{
			const args = await cmd.parseAsync(command.getOptions());
			if(args.h || !handled){
				await this.client.sendMessage(roomId, await cmd.getHelp());
				return true;
			}
		} catch (e) {
			if(e instanceof Error) await this.client.sendErrorMessage(roomId, e.message);
		}
		return true;
	}

	normaliseNames(usernames: (string | number)[]){
		let users = [];
		for(const u of usernames){
			if(typeof u === 'number') continue;
			let user = u.trim();
			if(!user.length) continue;
			if(!user.startsWith('@')) user = '@' + user;
			if(!user.includes(':')) user += (':' + this.client.config.serverName);
			users.push(user);
		}
		return users;
	}
}