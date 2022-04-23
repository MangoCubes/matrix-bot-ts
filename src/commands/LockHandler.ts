import CommandHandler from "./CommandHandler";
import minimist from 'minimist';

export default class EchoHandler extends CommandHandler{
	async handleMessage(command: readonly string[], sender: string, roomId: string): Promise<void> {
		if(command[0] !== this.prefix) return;
		const args = minimist(command.slice(1), {
			boolean: ['lock'],
			alias: {
				'lock': ['l']
			}
		});
		if(args.lock) {
			if(await this.client.isLocked(sender, roomId)) await this.client.sendMessage(roomId, `You are already locked.`);
			else {
				await this.client.lockCommands(sender, roomId);
				await this.client.sendMessage(roomId, `You have been locked.`);
			}
		} else {
			if(await this.client.isLocked(sender, roomId)) {
				await this.client.unlockCommands(sender, roomId);
				await this.client.sendMessage(roomId, `You have been unlocked.`);
			} else await this.client.sendMessage(roomId, `You are already unlocked.`);	
		}
	}
}