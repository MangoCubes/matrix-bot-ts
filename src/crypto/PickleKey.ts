import { encodeUnpaddedBase64 } from "matrix-js-sdk/lib/crypto/olmlib";
import crypto, { KeyObject } from 'crypto';

async function getRandomBytes(byteSize: number): Promise<Buffer>{
	return await new Promise((res, rej) => {
		crypto.randomBytes(byteSize, (err, buffer) => {
			if (err) rej(err);
			res(buffer);
		});
	});
}

async function generateKey(length: number): Promise<KeyObject>{
	return await new Promise((res, rej) => {
		crypto.generateKey('aes', {length: length}, (err, buffer) => {
			if (err) rej(err);
			res(buffer);
		});
	});
}

export async function createPickleKey(userId: string, deviceId: string): Promise<string> {
	const randomArray = await getRandomBytes(32);
	const key = await generateKey(256);
	const iv = await getRandomBytes(32);
	const additionalData = new Uint8Array(userId.length + deviceId.length + 1);
	for (let i = 0; i < userId.length; i++) additionalData[i] = userId.charCodeAt(i);
	additionalData[userId.length] = 124; // "|"
	for (let i = 0; i < deviceId.length; i++) additionalData[userId.length + 1 + i] = deviceId.charCodeAt(i);

	const encrypted = crypto.createCipheriv('aes-256-gcm', key, iv);
	encrypted.update(randomArray);
	encrypted.final('base64');
	return encodeUnpaddedBase64(randomArray);
}

// export async function getPickleKey(userId: string, deviceId: string): Promise<string | null> {
// 	let data;
// 	try {
// 		data = await this.idbLoad("pickleKey", [userId, deviceId]);
// 	} catch (e) {
// 		logger.error("idbLoad for pickleKey failed", e);
// 	}
// 	if (!data) {
// 		return null;
// 	}
// 	if (!data.encrypted || !data.iv || !data.cryptoKey) {
// 		logger.error("Badly formatted pickle key");
// 		return null;
// 	}

// 	const additionalData = new Uint8Array(userId.length + deviceId.length + 1);
// 	for (let i = 0; i < userId.length; i++) {
// 		additionalData[i] = userId.charCodeAt(i);
// 	}
// 	additionalData[userId.length] = 124; // "|"
// 	for (let i = 0; i < deviceId.length; i++) {
// 		additionalData[userId.length + 1 + i] = deviceId.charCodeAt(i);
// 	}

// 	try {
// 		const key = await crypto.subtle.decrypt(
// 			{ name: "AES-GCM", iv: data.iv, additionalData }, data.cryptoKey,
// 			data.encrypted,
// 		);
// 		return encodeUnpaddedBase64(key);
// 	} catch (e) {
// 		logger.error("Error decrypting pickle key");
// 		return null;
// 	}
// }