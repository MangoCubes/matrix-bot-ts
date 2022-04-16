import { ArgumentParser } from "argparse";
import { MatrixEvent, IClearEvent } from "matrix-js-sdk";
import CommandHandler from "./CommandHandler";

export default class EchoHandler extends CommandHandler{
	async respond(command: string[], event: MatrixEvent, clear: IClearEvent): Promise<void> {
		await this.client.sendMessage(clear.room_id!, command.join(' '));
	}
}