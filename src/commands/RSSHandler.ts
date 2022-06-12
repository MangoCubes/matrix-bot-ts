import yargs from "yargs/yargs";
import Command from "../class/Command";
import CommandHandler from "./CommandHandler";

export default class RSSHandler extends CommandHandler{
	async handleMessage(command: Command, sender: string, roomId: string): Promise<boolean> {
		if(command.getName() !== this.prefix) return false;
		let failed: string | null = null;
		let helpShown = false;
		const cmd = yargs().scriptName('!rss').showHelpOnFail(false).option('help', {
			alias: 'h',
			type: 'boolean',
		}).fail((m) => {
			failed = m
		}).help(false).version(false).exitProcess(false).command(['add', 'a'], 'Listen to new RSS feed', async (cmd) => {
			const args = await cmd.usage('!rss add <URL>').string('_').parseAsync(command.command.slice(2));
			const exp = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/=]*)?/gi;
			const url = args._[0];
			if(typeof(url) === 'string' && url.match(exp)){
				await this.client.db.addRSSUrl(url);
				await this.client.sendMessage(roomId, `Added new URL: ${url}.`);
				return;
			} else {
				await this.client.sendMessage(roomId, `Invalid URL: ${url}.`);
				return;
			}
		});
		const args = await cmd.parseAsync(command.getOptions());
		if (failed) await this.client.sendMessage(roomId, failed);
		else if (args.h && !helpShown) await this.client.sendMessage(roomId, await cmd.getHelp());
		return true;
	}
}