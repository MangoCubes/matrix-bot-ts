import DatabaseConstructor, { Database } from 'better-sqlite3';
export default class SQLite{
	db: Database;
	constructor(dir: string){
		this.db = new DatabaseConstructor(dir);
	}

	async deleteRSSUrl(ids: number[]){
		const stmt = this.db.prepare('DELETE FROM rss WHERE id = ?;');
		const tr = this.db.transaction(() => {
			for (const id of ids) stmt.run(id);
        });
		tr();
	}

	async getRSSUrl(): Promise<{id: number, user: string, url: string}[]>{
		const stmt = this.db.prepare('SELECT id, user, url FROM rss;');
		const res = stmt.all();
		let ret: Awaited<ReturnType<SQLite['getRSSUrl']>> = [];
		for(const r of res) ret.push({id: r.id, user: r.user, url: r.url});
		return ret;
	}

	async addRSSUrl(url: string, user: string){
		const stmt = this.db.prepare('INSERT INTO rss (url, user) VALUES (?, ?);');
		const tr = this.db.transaction(() => {
			stmt.run(url, user);
        });
		tr();
	}

	async addTrustedUser(username: string[]){
		const stmt = this.db.prepare('INSERT INTO trusted (user) VALUES (?);');
		const tr = this.db.transaction(() => {
			for(const u of username) stmt.run(u);
        });
		tr();
	}

	async removeTrustedUser(username: string[]){
		const stmt = this.db.prepare('DELETE FROM trusted WHERE user = ?;');
		const tr = this.db.transaction(() => {
			for(const u of username) stmt.run(u);
        });
		tr();
	}

	async isTrusted(username: string){
		return this.db.prepare(`SELECT EXISTS (SELECT * FROM trusted WHERE user = ?) AS res;`).get(username).res === 1;
	}

	async getTrusted(){
		const stmt = this.db.prepare('SELECT user FROM trusted;');
		const res = stmt.all();
		let ret: string[] = [];
		for(const r of res) ret.push(r.user);
		return ret;
	}

	init(){
        try {
			this.db.exec('PRAGMA foreign_keys = ON;');
			
            this.db.exec('CREATE TABLE IF NOT EXISTS rss (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, url TEXT, FOREIGN KEY (user) REFERENCES trusted(user));');
			this.db.exec('CREATE TABLE IF NOT EXISTS trusted (user TEXT PRIMARY KEY);');

		} catch(e){
            if(process.env.NODE_ENV === 'development') throw e;
            return -1;
        }
    }
}