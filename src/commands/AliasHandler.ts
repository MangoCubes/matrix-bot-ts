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
		const cmd = yargs().option('a', {
			alias: 'alias',
			type: 'array',
		}).option('o', {
			alias: ['orig', 'original'],
			type: 'array'
		}).string(['a', 'o']).demandOption(['o']).requiresArg(['a', 'o']).exitProcess(false);
		const args = cmd.parseSync(command.slice(1));
		const aliasData: Alias = {
			pattern: args.a ? args.a : [],
			aliasOf: args.o
		}
		if(!this.aliases[roomId]) this.aliases[roomId] = [aliasData];
		else this.aliases[roomId].push(aliasData);
		await this.writeFile();
		await this.client.sendMessage(roomId, 'Alias set.');
		await this.client.unlockCommands(sender, roomId);
		return;
	}
	
	parse(pattern: readonly string[], command: readonly string[]): null | {remainder: string[]}{
		let i = 0;
		for(; i < pattern.length; i++) if(pattern[i] !== command[i]) return null;
		return {
			remainder: command.slice(i)
		}
	}
}