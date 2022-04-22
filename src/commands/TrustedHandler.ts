import { MatrixEvent, IClearEvent } from "matrix-js-sdk";
import yargs from 'yargs/yargs';
import CommandHandler from "./CommandHandler";

export default class TrustedHandler extends CommandHandler{
	async handleMessage(command: readonly string[], sender: string, roomId: string): Promise<void> {
		if(command[0] !== this.prefix) return;
		const args = yargs(command.slice(1)).string(['_']).version(false).help(false).exitProcess(false).showHelpOnFail(false).options({
			overwrite: {type: 'boolean', alias: 'o'},
			add: {type: 'boolean', alias: 'a'},
			remove: {type: 'boolean', alias: 'r'}
		}).parseSync();
		const users = args._.map((v) => typeof(v) === 'string' ? v : v.toString());
		const input = this.normaliseNames(users);
		let newUserList = [];
		if(args.overwrite) newUserList = [...input];
		else if(args.remove) {
			const tempSet = new Set<string>(this.client.trusted.trusted);
			for(const u of input) tempSet.delete(u);
			newUserList = Array.from(tempSet);
		}
		else {
			const tempSet = new Set(this.client.trusted.trusted.concat(input));
			newUserList = Array.from(tempSet);
		}
		await this.changeUsers(newUserList);
		await this.client.sendMessage(roomId, `The following users have been added to the trusted list:\n${this.client.trusted.trusted.join(', ')}`);
	}

	normaliseNames(usernames: string[]){
		let users = [];
		for(const u of usernames){
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