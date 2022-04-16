import express from "express";
import Client from "../Client";

interface Notification{
	appName: string,
	title: string,
	body: string,
	actionNames?: string[]
}

export default async function receivedNotification(req: express.Request, res: express.Response){
	try{
		const client: Client = req.app.get('client');
		const n: Notification = req.body;
		const room = await client.findRoomByDir([client.userId!, 'Notification', n.appName], true);
		if(!room){
			res.json({res: 1, msg: 'Cannot find/create room.'});
			return;
		}
		await client.sendMessage(room, `${n.title}\n${n.body}\n${n.actionNames ? n.actionNames.join('|') + '\n' : ''}`);
		res.json({res: 0});
	} catch (e){
		res.json({res: -1, msg: `Error: ${e}`});
	}
}