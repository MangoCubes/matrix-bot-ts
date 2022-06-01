// import { encodeUnpaddedBase64 } from "matrix-js-sdk/lib/crypto/olmlib";
// import { logger } from "matrix-js-sdk/lib/logger";

// export default class IndexedDB{
// 	idb!: IDBDatabase;
// 	async init(){
// 		this.idb = await new Promise((resolve, reject) => {
// 			const request = indexedDB.open("matrix-react-sdk", 1);
// 			request.onerror = reject;
// 			request.onsuccess = () => { resolve(request.result); };
// 			request.onupgradeneeded = () => {
// 				const db = request.result;
// 				db.createObjectStore("pickleKey");
// 				db.createObjectStore("account");
// 			};
// 		});
// 	}
// 	async idbLoad(
// 		table: string,
// 		key: string | string[],
// 	): Promise<any> {
// 		if (!this.idb) await this.init();
// 		return new Promise((resolve, reject) => {
// 			const txn = this.idb.transaction([table], "readonly");
// 			txn.onerror = reject;
// 			const objectStore = txn.objectStore(table);
// 			const request = objectStore.get(key);
// 			request.onerror = reject;
// 			request.onsuccess = (event) => { resolve(request.result); };
// 		});
// 	}
// 	async idbSave(
// 		table: string,
// 		key: string | string[],
// 		data: any,
// 	): Promise<void> {
// 		if (!this.idb) await this.init();
// 		return new Promise((resolve, reject) => {
// 			const txn = this.idb.transaction([table], "readwrite");
// 			txn.onerror = reject;
// 			const objectStore = txn.objectStore(table);
// 			const request = objectStore.put(data, key);
// 			request.onerror = reject;
// 			request.onsuccess = (event) => { resolve(); };
// 		});
// 	}
// 	async idbDelete(
// 		table: string,
// 		key: string | string[],
// 	): Promise<void> {
// 		if (!this.idb) await this.init();
// 		return new Promise((resolve, reject) => {
// 			const txn = this.idb.transaction([table], "readwrite");
// 			txn.onerror = reject;
	
// 			const objectStore = txn.objectStore(table);
// 			const request = objectStore.delete(key);
// 			request.onerror = reject;
// 			request.onsuccess = () => { resolve(); };
// 		});
// 	}
// 	async createPickleKey(userId: string, deviceId: string): Promise<string | null> {
// 		const randomArray = new Uint8Array(32);
// 		crypto.getRandomValues(randomArray);
// 		const cryptoKey = await crypto.subtle.generateKey(
// 			{ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
// 		);
// 		const iv = new Uint8Array(32);
// 		crypto.getRandomValues(iv);
	
// 		const additionalData = new Uint8Array(userId.length + deviceId.length + 1);
// 		for (let i = 0; i < userId.length; i++) {
// 			additionalData[i] = userId.charCodeAt(i);
// 		}
// 		additionalData[userId.length] = 124; // "|"
// 		for (let i = 0; i < deviceId.length; i++) {
// 			additionalData[userId.length + 1 + i] = deviceId.charCodeAt(i);
// 		}
	
// 		const encrypted = await crypto.subtle.encrypt(
// 			{ name: "AES-GCM", iv, additionalData }, cryptoKey, randomArray,
// 		);
	
// 		try {
// 			await this.idbSave("pickleKey", [userId, deviceId], { encrypted, iv, cryptoKey });
// 		} catch (e) {
// 			return null;
// 		}
// 		return encodeUnpaddedBase64(randomArray);
// 	}
// 	async getPickleKey(userId: string, deviceId: string): Promise<string | null> {
//         let data;
//         try {
//             data = await this.idbLoad("pickleKey", [userId, deviceId]);
//         } catch (e) {
//             logger.error("idbLoad for pickleKey failed", e);
//         }
//         if (!data) {
//             return null;
//         }
//         if (!data.encrypted || !data.iv || !data.cryptoKey) {
//             logger.error("Badly formatted pickle key");
//             return null;
//         }

//         const additionalData = new Uint8Array(userId.length + deviceId.length + 1);
//         for (let i = 0; i < userId.length; i++) {
//             additionalData[i] = userId.charCodeAt(i);
//         }
//         additionalData[userId.length] = 124; // "|"
//         for (let i = 0; i < deviceId.length; i++) {
//             additionalData[userId.length + 1 + i] = deviceId.charCodeAt(i);
//         }

//         try {
//             const key = await crypto.subtle.decrypt(
//                 { name: "AES-GCM", iv: data.iv, additionalData }, data.cryptoKey,
//                 data.encrypted,
//             );
//             return encodeUnpaddedBase64(key);
//         } catch (e) {
//             logger.error("Error decrypting pickle key");
//             return null;
//         }
//     }
// }