import CommandHandler from "./CommandHandler";

export default class InviteHandler extends CommandHandler{
	async handleMessage(command: readonly string[], sender: string, roomId: string): Promise<void> {
		if(command[0] !== this.prefix) return;
		await this.client.invite(sender);
	}
}