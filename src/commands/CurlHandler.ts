import axios from "axios";
import yargs from "yargs/yargs";
import Command from "../class/Command";
import CommandHandler from "./CommandHandler";

export default class DebugHandler extends CommandHandler{
	async handleMessage(command: Command, sender: string, roomId: string): Promise<boolean> {
		if(command.getName() !== this.prefix) return false;
		let failed: string | null = null;
		const args = await yargs().scriptName('!curl').showHelpOnFail(false).option('h', {
			alias: 'help',
			type: 'boolean',
		}).fail((m) => {
			failed = m
		}).help(false).version(false).exitProcess(false).option('request', {
			alias: ['X'],
			choices: ['GET', 'POST', 'PUT'],
			default: 'GET'
		}).option('data', {
			alias: ['d'],
			type: 'string'
		}).option('header', {
			alias: ['H'],
			type: 'string'
		}).string(['data', 'header']).string('_').parseAsync(command.command.slice(1));
		if(args.request === 'GET' && args.data) {
			await this.client.sendMessage(roomId, 'You cannot have body for GET request.');
			return true;
		}
		let headers: {[name: string]: string} | undefined;
		if(!args.header) headers = undefined;
		else if(typeof(args.header) === 'string'){
			headers = {};
			const split = args.header.split(':');
			headers[split[0].trim()] = split[1].trim();
		} else {
			headers = {};
			for(const s of (args.header as string[])){
				const split = s.split(':');
				headers[split[0].trim()] = split[1].trim();
			}
		}
		let message;
		const url = args._[0] as string;
		if(args.request === 'GET'){
			message = (await axios.get(url, {
				headers: headers
			})).data;
		} else {
			const body = args.data ? JSON.parse(args.data) : undefined;
			if(args.request === 'POST') {
				message = (await axios.post(url, {
					headers: headers,
					body: args.data
				})).data;
			} else if(args.request === 'PUT') {
				message = (await axios.put(url, {
					headers: headers,
					body: args.data
				})).data;
			}
		}
		await this.client.sendMessage(roomId, JSON.stringify(message, null, 4));
		return true;
	}
}