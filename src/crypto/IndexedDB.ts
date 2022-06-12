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
	
// }