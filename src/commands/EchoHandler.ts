import { ArgumentParser } from "argparse";
import { MatrixEvent, IClearEvent } from "matrix-js-sdk";
import CommandHandler from "./CommandHandler";

export default class EchoHandler extends CommandHandler{
	async handleMessage(command: string[], event: MatrixEvent, clear: IClearEvent): Promise<void> {
		if(command[0] !== this.prefix) return;
		command.splice(0, 1);
		await this.client.sendMessage(clear.room_id!, command.join(' '));
	}
}