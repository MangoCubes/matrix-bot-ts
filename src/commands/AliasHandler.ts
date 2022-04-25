import Client from "../Client";
//import { Command, Option } from "commander";
import CommandHandler from "./CommandHandler";
import fs from 'fs';
import path from "path";
import yargs from "yargs/yargs";
import Command from "../class/Command";

interface Alias{
	pattern: readonly string[];
	aliasOf: readonly string[];
}

export default class InviteHandler extends CommandHandler{
	aliases: {
		[roomId: string]: Alias[]
	};
	fileLocation: string;
	constructor(client: Client, prefix: string, fileLocation: string){
		super(client, prefix);
		this.fileLocation = fileLocation;
		if(fs.existsSync(this.fileLocation)) this.aliases = JSON.parse(fs.readFileSync(this.fileLocation, 'utf8'));
		else {
			this.aliases = {};
			fs.mkdirSync(path.dirname(this.fileLocation), {recursive: true});
			fs.writeFileSync(this.fileLocation, '{}');
		}
	}

	async writeFile(){
		const writer = await fs.promises.open(this.fileLocation, 'w');
		await writer.write(JSON.stringify(this.aliases));
		writer.close();
	}

	async handleMessage(command: Command, sender: string, roomId: string): Promise<boolean> {
		if(command.getName() !== this.prefix) {
			if(!this.aliases[roomId]) return false;
			for(const a of this.aliases[roomId]){
				const res = this.parse(a.pattern, command.command);
				if(res === null) continue;
				else {
					const newCommand = new Command([...a.aliasOf, ...res.remainder], [this.cid]);
					return await this.client.handleCommand(newCommand, sender, roomId);
				}
			}
			return false;
		}
		let failed: string | null = null;
		let helpShown = false;
		const cmd = yargs().scriptName('!alias').showHelpOnFail(false).option('h', {
			alias: 'help',
			type: 'boolean',
		}).fail((m) => {
			failed = m
		}).help(false).version(false).exitProcess(false).command(['add', 'a'], 'Add new alias', async (cmd) => {
			const args = await cmd.usage('!alias add [-a <alias...>] -o <original...>').option('a', {
				alias: 'alias',
				type: 'array',
			}).option('o', {
				alias: ['orig', 'original'],
				type: 'array'
			}).string(['a', 'o']).requiresArg(['a', 'o']).parseAsync(command.command.slice(2));
			if (args.h) {
				await this.client.sendMessage(roomId, await cmd.getHelp());
				helpShown = true;
				return;
			} else {
				if(!args.o) {
					this.client.sendMessage(roomId, 'Original command must be present.');
					return;
				}
				const aliasData: Alias = {
					pattern: args.a ? args.a : [],
					aliasOf: args.o
				}
				if(!this.aliases[roomId]) this.aliases[roomId] = [aliasData];
				else this.aliases[roomId].push(aliasData);
				await this.writeFile();
				await this.client.sendMessage(roomId, 'Alias set.');
				return;
			}
		}).command(['remove', 'rm', 'r'], 'Remove aliases', async (cmd) => {
			const args = await cmd.usage('!alias remove <AliasID...>').parseAsync(command.command.slice(2));
			if (args.h) {
				await this.client.sendMessage(roomId, await cmd.getHelp());
				helpShown = true;
				return;
			}
			else {
				if(!this.aliases[roomId]){
					await this.client.sendMessage(roomId, 'This room does not have any aliases to remove.');
					return;
				}
				const args = await cmd.number('_').parseAsync(command.command.slice(2));
				let input = [];
				for(const n of args._) {
					if(typeof(n) === 'number') input.push(n - 1);
					else {
						const parsed = parseInt(n);
						if(!isNaN(parsed)) input.push(parsed - 1);
					}
				}
				input.sort().reverse();
				let removed = [];
				for(const n of input){
					if(n >= this.aliases[roomId].length) continue;
					this.aliases[roomId].splice(n, 1);
					removed.push(n);
				}
				if(!removed.length){
					await this.client.sendMessage(roomId, `No aliases removed.`);
					return;
				}
				for(let i = 0; i < removed.length; i++) removed[i]++;
				removed.reverse();
				await this.writeFile();
				await this.client.sendMessage(roomId, `Alias with ID ${removed.join(', ')} has been removed.`);
				return;
			}
		}).command(['list', 'ls'], 'List aliases', async (cmd) => {
			const args = await cmd.usage('!alias list').parseAsync(command.command.slice(2));
			if (args.h) {
				await this.client.sendMessage(roomId, await cmd.getHelp());
				helpShown = true;
				return;
			}
			else {
				if(!this.aliases[roomId]){
					await this.client.sendMessage(roomId, 'This room has no aliases set.');
					return;
				} else {
					let msg = [];
					for(let i = 0; i < this.aliases[roomId].length; i++){
						const a = this.aliases[roomId][i];
						msg.push(`${i + 1}: ${a.pattern.length ? a.pattern.join(' ') : '<Any>'} -> ${a.aliasOf.join(' ')}`);
					}
					await this.client.sendMessage(roomId, `List of aliases (Alias -> Translates to):\n${msg.join('\n')}`);
				}
			}
		});
		const args = await cmd.parseAsync(command.command.slice(1));
		if (failed) await this.client.sendMessage(roomId, failed);
		else if (args.h && !helpShown) await this.client.sendMessage(roomId, await cmd.getHelp());
		return true;
	}
	
	parse(pattern: readonly string[], command: readonly string[]): null | {remainder: string[]}{
		let i = 0;
		for(; i < pattern.length; i++) if(pattern[i] !== command[i]) return null;
		return {
			remainder: command.slice(i)
		}
	}
}