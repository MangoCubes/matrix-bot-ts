import { ArgumentParser } from "argparse";
import { MatrixEvent, IClearEvent } from "matrix-js-sdk";
import CommandHandler from "./CommandHandler";

export default class EchoHandler extends CommandHandler{
	async handleMessage(command: readonly string[], event: MatrixEvent, clear: IClearEvent): Promise<void> {
		if(command[0] !== this.prefix) return;
		const rest = command.slice(1);
		await this.client.sendMessage(clear.room_id!, rest.join(' '));
	}
}