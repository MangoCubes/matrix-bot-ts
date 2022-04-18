import { MatrixEvent, IClearEvent } from "matrix-js-sdk";
import CommandHandler from "./CommandHandler";

export default class AddTrustedHandler extends CommandHandler{
	async handleMessage(command: readonly string[], event: MatrixEvent, clear: IClearEvent): Promise<void> {
		if(command[0] !== this.prefix) return;
		let users = [];
		for(let i = 1; i < command.length; i++){
			let user = command[i];
			if(!user.startsWith('@')) user = '@' + user;
			if(!user.includes(':')) user += (':' + this.client.config.serverName);
			users.push(user);
		}
		const newList = this.client.trusted.trusted.concat(users);
		await this.client.changeTrustedList(newList);
		this.client.sendMessage(event.getRoomId()!, `The following users have been added to the trusted list:\n${users.join(', ')}`);
	}
}