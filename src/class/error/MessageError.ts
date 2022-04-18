export default class MessageError extends Error{
	target: string;
	isDM: boolean;
	constructor(target: string, isDM: boolean){
		super();
		this.target = target;
		this.isDM = isDM;
	}
}