import express from 'express';
import Client from '../Client';

interface Message {
	appName: string,
	sender: string,
	message: string,
	actionNames?: string[]
};

export default async function sendChat(req: express.Request, res: express.Response){
	const client: Client = req.app.get('client');
	const body: Message = req.body;
	try{
		const room = await client.findRoomByDir([client.userId!, body.appName, body.sender], true);
		if(room === null) res.json({res: 1, message: 'Chat room could not be created.'});
		else {
			await client.sendMessage(room, body.message);
			res.json({res: 0});
		}
	} catch (e) {
		res.json({res: -1, msg: `Error: ${e}`});
	}
	
}