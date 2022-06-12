import Client from "../Client";

/**
 * There are two kinds of tasks: Bot task and custom task
 * Bot tasks are created by bot by default
 * TODO: Custom tasks are tasks created by user with !task
 */

export default abstract class Task{
	id: NodeJS.Timer;
	constructor(public client: Client, public notifyOnError: string[], public name: string, public interval: number){
		this.id = setInterval(async () => {
			try {
				await this.run();
			} catch(e) {
				if (e instanceof Error) {
					for(const u of this.notifyOnError) await this.client.sendErrorDM(u, `Failed to execute task '${this.name}': ${e.message}.`);
				}
			}
		}, this.interval * 1000);
	}

	abstract run(): Promise<void>;
}