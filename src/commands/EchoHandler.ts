import CommandHandler from "./CommandHandler";

export default class EchoHandler extends CommandHandler{
	async handleMessage(command: readonly string[], sender: string, roomId: string): Promise<void> {
		if(command[0] !== this.prefix) return;
		const rest = command.slice(1);
		await this.client.sendMessage(roomId, rest.join(' '));
	}
}