import yargs from "yargs/yargs";
import Command from "../class/Command";
import CommandHandler from "./CommandHandler";

export default class TrustedHandler extends CommandHandler{
	async handleMessage(command: Command, sender: string, roomId: string): Promise<boolean> {
		if(command.getName() !== this.prefix) return false;
		const cmd = yargs().scriptName('!trust').help(false).version(false).exitProcess(false).command(['add', 'a'], 'Add new trusted users', async (cmd) => {
			const args = await cmd.string(['_']).option('o', {
				alias: 'overwrite',
				type: 'boolean'
			}).parseAsync(command.getOptions().options);
			const input = this.normaliseNames(args._);
			let newUserList = [];
			if(args.o) newUserList = [...input];
			else {
				const tempSet = new Set(this.client.trusted.trusted.concat(input));
				newUserList = Array.from(tempSet);
			}
			await this.changeUsers(newUserList);
			await this.client.sendMessage(roomId, `The following users have been added to the trusted list:\n${this.client.trusted.trusted.join('\n')}`);
		}).command(['remove', 'r'], 'Remove trusted users', async (cmd) => {
			const args = await cmd.parseAsync(command.getOptions().options);
			const input = this.normaliseNames(args._);
			let newUserList = [];
			const tempSet = new Set<string>(this.client.trusted.trusted);
			for(const u of input) tempSet.delete(u);
			newUserList = Array.from(tempSet);
			await this.changeUsers(newUserList);
			await this.client.sendMessage(roomId, `The following users have been removed to the trusted list:\n${input.join('\n')}`);
		}).command(['list', 'ls'], 'List trusted users', async (cmd) => {
			await this.client.sendMessage(roomId, 'List of trusted users:\n' + this.client.trusted.trusted.join('\n'));
		}).demandCommand(1).showHelp(async (m) => {
			await this.client.sendMessage(roomId, m);
		}).showHelpOnFail(false).option('h', {
			alias: 'help',
			type: 'boolean',
		});
		const args = await cmd.parseAsync(command.getOptions().options);
		if(args.h){
			await this.client.sendMessage(roomId, await cmd.getHelp());
			return true;
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

	async changeUsers(newList: string[]){
		await this.client.changeTrustedList(Array.from(newList));
	}
}