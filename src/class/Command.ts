export default class Command{
	command: string[];
	ignore: string[];
	constructor(command: string | string[], ignore: string[]){
		this.command = typeof(command) === 'string' ? command.split(' ') : command;
		this.ignore = ignore;
	}
	getName() {
		return this.command[0];
	}
}