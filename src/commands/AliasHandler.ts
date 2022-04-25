import Client from "../Client";
//import { Command, Option } from "commander";
import CommandHandler from "./CommandHandler";
import fs from 'fs';
import path from "path";
import yargs from "yargs/yargs";

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

	async handleMessage(command: readonly string[], sender: string, roomId: string): Promise<void> {
		if(command[0] !== this.prefix) {
			if(!this.aliases[roomId]) return;
			for(const a of this.aliases[roomId]){
				const res = this.parse(a.pattern, command);
				if(res === null) continue;
				else {
					const newCommand = [...a.aliasOf, ...res.remainder].join(' ');
					await this.client.handleCommand(newCommand, sender, roomId);
					return;
				}
			}
			return;
		}
		let failed: string | null = null;
		const cmd = yargs().showHelpOnFail(false).option('h', {
			alias: 'help',
			type: 'boolean',
		}).fail((m) => {
			failed = m
		}).help(false).version(false).exitProcess(false).command(['add', 'a'], 'Add new alias', async (cmd) => {
			const args = await cmd.option('a', {
				alias: 'alias',
				type: 'array',
			}).option('o', {
				alias: ['orig', 'original'],
				type: 'array'
			}).string(['a', 'o']).requiresArg(['a', 'o']).parseAsync(command.slice(2));
			if (args.h) await this.client.sendMessage(roomId, await cmd.getHelp());
			else {
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
		}).command(['remove', 'r'], 'Remove aliases', async (cmd) => {
			const args = await cmd.parseAsync(command.slice(2));
			if (args.h) await this.client.sendMessage(roomId, await cmd.getHelp());
			else {
				if(!this.aliases[roomId]){
					await this.client.sendMessage(roomId, 'This room does not have any aliases to remove.');
					return;
				}
				const args = await cmd.number('_').parseAsync(command.slice(2));
				let input = [];
				for(const n of args._) {
					if(typeof(n) === 'number') input.push(n - 1);
					else {
						const parsed = parseInt(n);
						if(!isNaN(parsed)) input.push(parsed - 1);
					}
				}
				input.sort();
				let removed = [];
				for(const n of input){
					if(n >= this.aliases[roomId].length) continue;
					for(let i = this.aliases[roomId].length - 1; i >= 0; i--){
						this.aliases[roomId].splice(n, 1);
						removed.push(n);
					}
				}
				await this.writeFile();
				await this.client.sendMessage(roomId, `Alias with ID ${removed.join(', ')} has been removed.`);
				return;
			}
		}).command(['list', 'ls'], 'List aliases', async (cmd) => {
			const args = await cmd.parseAsync(command.slice(2));
			if (args.h) await this.client.sendMessage(roomId, await cmd.getHelp());
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
		const args = await cmd.parseAsync(command.slice(1));
		if (failed) await this.client.sendMessage(roomId, failed);
		else if (args.h) await this.client.sendMessage(roomId, await cmd.getHelp());
	}
	
	parse(pattern: readonly string[], command: readonly string[]): null | {remainder: string[]}{
		let i = 0;
		for(; i < pattern.length; i++) if(pattern[i] !== command[i]) return null;
		return {
			remainder: command.slice(i)
		}
	}
}