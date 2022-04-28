import axios from "axios";
import yargs from "yargs/yargs";
import Command from "../class/Command";
import CommandHandler from "./CommandHandler";

export default class DebugHandler extends CommandHandler{
	async handleMessage(command: Command, sender: string, roomId: string): Promise<boolean> {
		if(command.getName() !== this.prefix) return false;
		let failed: string | null = null;
		const args = await yargs().scriptName('!curl').showHelpOnFail(false).option('help', {
			alias: 'h',
			type: 'boolean',
		}).fail((m) => {
			failed = m
		}).help(false).version(false).exitProcess(false).option('request', {
			alias: ['X'],
			choices: ['GET', 'POST', 'PUT'],
			default: 'GET',
			description: 'Request type.'
		}).option('data', {
			alias: ['d'],
			type: 'string',
			description: 'Data to send in POST/PUT request.'
		}).option('header', {
			alias: ['H'],
			type: 'string',
			description: 'Add header. Use -H <Header> multiple times for multiple headers.'
		}).option('silent', {
			alias: ['s'],
			type: 'boolean',
			description: 'Suppress output, and add check reaction if result code is 200'
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
		let status
		const url = args._[0] as string;
		if(args.request === 'GET'){
			const res = await axios.get(url, {
				headers: headers
			});
			message = res.data;
			status = res.status;
		} else {
			const body = args.data ? JSON.parse(args.data) : undefined;
			if(args.request === 'POST') {
				const res = await axios.post(url, {
					headers: headers,
					body: body
				});
				message = res.data;
				status = res.status;
			} else if(args.request === 'PUT') {
				const res = await axios.put(url, {
					headers: headers,
					body: body
				});
				message = res.data;
				status = res.status;
			} else {
				message = 'Invalid request type.';
				status = '-'
			}
		}
		if(args.silent) {
			const id = command.getEventId();
			if (id) {
				if(status === 200) await this.client.sendReaction(roomId, id, '✅');
				else await this.client.sendReaction(roomId, id, status.toString());
			} else this.client.sendMessage(roomId, 'Request success.');
		} else await this.client.sendMessage(roomId, JSON.stringify(message, null, 4));
		return true;
	}
}