import Client from "../Client";
import CommandHandler from "./CommandHandler";
import yargs from 'yargs/yargs';
import fs from 'fs';

interface Alias{
	pattern: readonly string[];
	aliasOf: readonly string[];
}

export default class InviteHandler extends CommandHandler{
	aliases: {
		[roomId: string]: Alias[]
	};
	fileLocation: string;
	steps: {
		[roomId: string]: {
			[user: string]: number;
		}
	}
	tempAliases: {
		[roomId: string]: {
			[userId: string]: readonly string[];
		}
	};
	constructor(client: Client, prefix: string, fileLocation: string){
		super(client, prefix);
		this.fileLocation = fileLocation;
		if(fs.existsSync(this.fileLocation)) this.aliases = JSON.parse(fs.readFileSync(this.fileLocation, 'utf8'));
		else {
			this.aliases = {};
			fs.writeFileSync(this.fileLocation, '{}');
		}
		this.tempAliases = {};
		this.steps = {};
	}

	async writeFile(){
		const writer = await fs.promises.open(this.fileLocation, 'w');
		await writer.write(JSON.stringify(this.aliases));
		writer.close();
	}

	async handleMessage(command: readonly string[], sender: string, roomId: string): Promise<void> {
		if(this.steps[roomId][sender] === 1){
			this.tempAliases[roomId][sender] = command;
			await this.client.sendMessage(roomId, 'Please type the command you want this alias to replace.');
			this.steps[roomId][sender] = 2;
			return;
		} else if(this.steps[roomId][sender] === 2){
			const alias = this.tempAliases[roomId][sender];
			this.aliases[roomId].push({
				pattern: alias,
				aliasOf: command
			});
			await this.writeFile();
			await this.client.sendMessage(roomId, 'Alias set.');
			delete this.steps[roomId][sender];
			await this.client.unlockCommands(sender, roomId);
			return;
		}
		if(command[0] !== this.prefix) {
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
		const args = yargs(command.slice(1)).string(['_']).version(false).help(false).exitProcess(false).showHelpOnFail(false).positional('mode', {
			choices: ['a', 'add', 'r', 'remove']
		}).parseSync();
		if(!this.steps[roomId][sender]){
			if(args.mode === 'a' || args.mode === 'add'){
				await this.client.sendMessage(roomId, 'Please type the command you want to create.');
				await this.client.lockCommands(sender, roomId);
				this.steps[roomId][sender] = 1;
			}
		}
	}
	
	parse(pattern: readonly string[], command: readonly string[]): null | {remainder: string[]}{
		let i = 0;
		for(; i < pattern.length; i++) if(pattern[i] !== command[i]) return null;
		return {
			remainder: command.slice(i)
		}
	}
}