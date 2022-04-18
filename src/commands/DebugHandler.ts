import { MatrixEvent, IClearEvent } from "matrix-js-sdk";
import CommandHandler from "./CommandHandler";

export default class DebugHandler extends CommandHandler{
	async handleMessage(command: readonly string[], event: MatrixEvent, clear: IClearEvent): Promise<void> {
		if(command[0] !== this.prefix) return;
		throw new Error("Method not implemented.");
	}
}