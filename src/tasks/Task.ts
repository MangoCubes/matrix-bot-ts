import Client from "../Client";

/**
 * There are two kinds of tasks: Bot task and custom task
 * Bot tasks are created by bot by default
 * TODO: Custom tasks are tasks created by user with !task
 */

export class TaskError extends Error{
	constructor(public notify: string[]){
		super();
	}
}

export default abstract class Task{
	id: NodeJS.Timer | null;
	loaded: boolean;
	constructor(public client: Client, public name: string, public interval: number){
		this.id = null;
		this.loaded = false;
	}

	abstract loadTask(): Promise<void>;

	startTask() {
		if(!this.loaded) throw new Error('Task not loaded.');
		this.id = setInterval(async () => {
			try {
				await this.run();
			} catch(e) {
				if (e instanceof TaskError) {
					for(const u of e.notify) await this.client.sendErrorDM(u, `Failed to execute task '${this.name}': ${e.message}.`);
					
				}
				console.log(e)
			}
		}, this.interval * 1000);
	}

	abstract run(): Promise<void>;
}