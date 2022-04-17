import { MatrixEvent, IClearEvent } from "matrix-js-sdk";
import CommandHandler from "./CommandHandler";

export default class InviteHandler extends CommandHandler{
	async onMessage(command: string[], event: MatrixEvent, clear: IClearEvent): Promise<void> {
		if(command[0] !== this.prefix) return;
		await this.client.invite(event.getSender());
	}
}