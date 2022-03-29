import * as readline from 'readline';
import sdk from 'matrix-js-sdk';
import { promises as fs } from 'fs';

interface ConfigFile{
	serverUrl: string,
	accessToken: string,
	storage: string,
	userId: string,
	deviceId: string,
	logRoom: string
}

export default function generateConfig(){
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false
	});
	let config: ConfigFile = {
		serverUrl: '',
		accessToken: '',
		storage: '',
		userId: '',
		deviceId: '',
		logRoom: ''
	}
	console.log('No config file found. Creating new one.');
	let step = 0;
	let hsUrl = '';
	rl.setPrompt('Please enter homeserver URL: ');
	rl.prompt();
	rl.on('line', async (line) => {
		switch(step){
			case 0:
				let url = line.trim();
				if(!url.length) break;
				if(!url.startsWith('http')) {
					hsUrl = url;
					url = 'https://' + url;
				} else hsUrl = url.split('//')[1];
				config.serverUrl = url;
				console.log(url);
				step = 1;
				rl.setPrompt('Please enter your username: ');
				break;
			case 1:
				let username = line.trim();
				if(!username.length) break;
				if(!username.startsWith('@')) username = `@${username}:${hsUrl}`;
				config.userId = username;
				console.log(username);
				step = 2;
				rl.setPrompt('Please enter the ID of the room this bot should log into: ');
				break;
			case 2:
				let roomId = line.trim();
				if(!roomId.length || !roomId.startsWith('!')) break;
				config.logRoom = roomId;
				console.log(roomId);
				step = 3;
				rl.setPrompt('Please enter path to store cryptographic files: ');
				break;
			case 3:
				let directory = line.trim();
				if(!directory.length) break;
				config.storage = directory;
				console.log(directory);
				step = 4;
				rl.setPrompt('Please enter your password: ');
				break;
			case 4:
				let password = line;
				const client = sdk.createClient(config.serverUrl);
				try{
					const res = await client.loginWithPassword(config.userId, password);
					config.accessToken = res.access_token;
					config.deviceId = res.device_id;
					await fs.writeFile('./config/credentials.json', JSON.stringify(config));
					await fs.mkdir(config.storage, {recursive: true});
					console.log('File successfully created. Please restart.');
					return;
				} catch(e){
					console.log('Cannot login.');
					console.log(e);
					process.exit(1);
				}
		}
		rl.prompt();
	});
}