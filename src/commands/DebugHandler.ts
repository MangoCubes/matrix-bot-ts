import CommandHandler from "./CommandHandler";

export default class DebugHandler extends CommandHandler{
	async handleMessage(command: readonly string[], sender: string, roomId: string): Promise<void> {
		if(command[0] !== this.prefix) return;
		throw new Error("Method not implemented.");
	}
}