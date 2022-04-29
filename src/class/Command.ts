export class ParsingError extends Error{
}

export default class Command{
	command: string[];
	ignore: string[];
	eventId: string | undefined;
	constructor(command: string | string[], eventId: string | undefined, ignore: string[]){
		this.eventId = eventId;
		if(typeof(command) === 'string') this.command = commandParser(command);
		else this.command = command;
		this.ignore = ignore;
	}
	getName() {
		return this.command[0];
	}
	getEventId() {
		return this.eventId;
	}
	getOptions() {
		return this.command.slice(1);
	}
}

export function commandParser(command: string){
	const split = command.match(/(?:\\"|\\'|[^"'\s])+|(["'])(?:\\"|[^"]|\\'|[^'])+?\1/g);
	/**
	 * Regex explanation
	 * 1st alternative: [^"'\s]+
	 * 	- Matches anything that doesn't contain whitespace, ' or "
	 * 2nd alternative: ["'](?:\\"|[^"]|\\'|[^'])+["']
	 * 	- (["']): First capture group, matches a quotemark start
	 *  - (?:\\"|[^"]|\\'|[^']): Non-capturing group, captures one of the following:
	 * 		- \\": Captures \", escaped quotemark
	 * 		- [^"]: Anything that isn't "
	 * 		- \\': Captures \', escaped quotemark
	 * 		- [^']: Anything that isn't '
	 * 	- +: Capture 1+ of these, in a greedy manner
	 * 	- \1: Backreference to first capture group, which is a closing quotemark
	 */
	if(!split) throw new ParsingError('Invalid quotes.');
	else {
		let arr = split;
		console.log(arr);
		for(let i = 0; i < arr.length; i++){
			const match = arr[i].match(/^["'](.+)["']$/);
			if(match) arr[i] = match[1];
			arr[i] = arr[i].replace(/\\"/g, '"');
			arr[i] = arr[i].replace(/\\'/g, "'");
		}
		
		return arr;
	}
}