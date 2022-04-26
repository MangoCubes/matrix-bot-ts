export class ParsingError extends Error{
}

export default class Command{
	command: string[];
	ignore: string[];
	constructor(command: string | string[], ignore: string[]){
		if(typeof(command) === 'string'){
			const split = command.match(/\w+|"(?:\\"|[^"])+"/g);
			if(!split) throw new ParsingError('Invalid quotes.');
			else this.command = split;
		}else this.command = command;
		this.ignore = ignore;
	}
	getName() {
		return this.command[0];
	}
}