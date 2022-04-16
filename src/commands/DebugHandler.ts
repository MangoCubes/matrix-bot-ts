import { MatrixEvent, IClearEvent } from "matrix-js-sdk";
import CommandHandler from "./CommandHandler";

export default class DebugHandler extends CommandHandler{
	async respond(command: string[], event: MatrixEvent, clear: IClearEvent): Promise<void> {
		throw new Error("Method not implemented.");
	}
}