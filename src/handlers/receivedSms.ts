import express from 'express';
import Client from '../Client';

export default async function sendSms(req: express.Request, res: express.Response){
	const client: Client = req.app.get('client');
	const msg = req.body.message;
	const room = await client.findSpaceByName('SMS');
	if(!room) res.json({res: 1, message: 'No SMS space found.'});
	else {
		const smsRoom = await client.findOrCreateRoomInSpace()
	}
}