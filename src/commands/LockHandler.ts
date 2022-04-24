import yargs from "yargs/yargs";
import CommandHandler from "./CommandHandler";

export default class EchoHandler extends CommandHandler{
	async handleMessage(command: readonly string[], sender: string, roomId: string): Promise<void> {
		if(command[0] !== this.prefix) return;
		const cmd = yargs().option('i', {
			alias: 'info',
			type: 'boolean',
		}).exitProcess(false);
		const args = cmd.parseSync(command.slice(1));
		if(args.i) {
			const lock = await this.client.getLock(sender, roomId);
			if(!lock){
				await this.client.sendMessage(roomId, `You are already unlocked.`);
				return;
			}
			const command = this.client.handlers.find((v) => v.cid === lock);
			if(!command) {
				await this.client.unlockCommands(sender, roomId);
				await this.client.sendMessage(roomId, `Invalid lock detected. Unlocking...`);
			} else {
				await this.client.sendMessage(roomId, `You are currently locked onto command with prefix ${command.prefix}`);
			}
		} else {
			if(await this.client.getLock(sender, roomId)) {
				await this.client.unlockCommands(sender, roomId);
				await this.client.sendMessage(roomId, `You have been unlocked.`);
			} else await this.client.sendMessage(roomId, `You are already unlocked.`);	
		}
	}
}