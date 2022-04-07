import * as sdk from 'matrix-js-sdk';

export default async function debug(client: sdk.MatrixClient, room: sdk.Room | null): Promise<string>{
	if(!room) return 'Invalid room.';
	let ret = '';
	for(const m of room.getMembers()){
		const dev = client.getStoredDevicesForUser(m.userId);
		ret += JSON.stringify(dev, null, 2);
	}
	return ret;
}