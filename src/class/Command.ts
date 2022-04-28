export class ParsingError extends Error{
}

export default class Command{
	command: string[];
	ignore: string[];
	eventId: string | undefined;
	constructor(command: string | string[], eventId: string | undefined, ignore: string[]){
		this.eventId = eventId;
		if(typeof(command) === 'string'){
			const split = command.match(/[^"\s]+|"(?:\\"|[^"])+"/g);
			if(!split) throw new ParsingError('Invalid quotes.');
			else {
				this.command = split;
				for(let i = 0; i < this.command.length; i++){
					const match = this.command[i].match(/^"(.+)"$/);
					if(match) this.command[i] = match[1];
				}
			}
		}else this.command = command;
		this.ignore = ignore;
	}
	getName() {
		return this.command[0];
	}
	getEventId() {
		return this.eventId;
	}
}