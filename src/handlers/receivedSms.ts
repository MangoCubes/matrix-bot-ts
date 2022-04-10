import express from 'express';
import Client from '../Client';

interface Message {
	sender: string,
	message: string
};

export default async function sendSms(req: express.Request, res: express.Response){
	// const client: Client = req.app.get('client');
	// const body: Message = req.body;
	// const room = await client.findSpaceByName('SMS');
	// if(!room) res.json({res: 1, message: 'No SMS space found.'});
	// else {
	// 	const smsRoom = await client.findOrCreateRoomInSpace(room.roomId, body.sender);
	// 	if(smsRoom === null) res.json({res: 2, message: 'SMS room could not be created.'});
	// 	else {
	// 		await client.sendMessage(smsRoom, body.message);
	// 		res.json({res: 0});
	// 	}
	// }
}