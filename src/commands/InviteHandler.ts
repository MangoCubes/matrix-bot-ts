import { MatrixEvent, IClearEvent } from "matrix-js-sdk";
import CommandHandler from "./CommandHandler";

export default class InviteHandler extends CommandHandler{
	async respond(command: string[], event: MatrixEvent, clear: IClearEvent): Promise<void> {
		await this.client.invite(event.getSender());
	}
}