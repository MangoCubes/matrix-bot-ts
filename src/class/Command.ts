export class ParsingError extends Error{
}

export default class Command{
	command: {
		options: string;
		parsed: false;
	} | {
		options: string[];
		parsed: true;
	}
	ignore: string[];
	commandName: string;
	eventId: string | undefined;
	constructor(command: string | string[], eventId: string | undefined, ignore: string[]){
		this.eventId = eventId;
		if(typeof(command) === 'string'){
			const match = command.match(/^`([^`]+)`$/);
			if (match) command = match[1];
			const cmd = command.split(' ');
			this.commandName = cmd[0];
			this.command = {
				options: cmd.slice(1).join(' '),
				parsed: false
			}
		} else {
			this.commandName = command[0];
			this.command = {
				options: command.slice(1),
				parsed: true
			}
		}
		this.ignore = ignore;
	}
	getName() {
		return this.commandName;
	}

	getEventId() {
		return this.eventId;
	}

	getOptions(){
		return this.command;
	}
}