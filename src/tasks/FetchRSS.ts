import Parser, { Item } from "rss-parser";
import Task from "./Task";

export default class FetchRSS extends Task{
	async loadTask(): Promise<void> {
		this.loaded = true;
	}
	async run(): Promise<void> {
		const rssList = await this.client.db.getRSSUrl();
		console.log('RSS: ', rssList);
		const parser = new Parser();
		const rssMap: {[userId: string]: {url: string, items: Item[]}[]} = {};
		for(const r of rssList){
			const res = await parser.parseURL(r.url);
			if(!rssMap[r.user]) rssMap[r.user] = [];
			rssMap[r.user].push({
				url: r.url,
				items: res.items
			});
		}
		for(const user in rssMap){
			let msg = '';
			const t = rssMap[user]
			for(const feed of rssMap[user]){
				msg += `Feed from ${feed.url}:`;
				for(const item of feed.items){
					msg += JSON.stringify(item);
				}
			}
			await this.client.sendDM(user, msg);
		}
	}
}