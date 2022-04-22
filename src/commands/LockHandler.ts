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
		console.log(args)
		if(args.lock) await this.client.lockCommands(sender, roomId);
		else await this.client.unlockCommands(sender, roomId);
		await this.client.sendMessage(roomId, `You have been ${args.lock ? '' : 'un'}locked.`);
	}
}