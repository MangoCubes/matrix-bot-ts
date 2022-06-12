import DatabaseConstructor, { Database } from 'better-sqlite3';
export default class SQLite{
	db: Database;
	constructor(dir: string){
		this.db = new DatabaseConstructor(dir);
	}

	async getRSSUrl(url: string): Promise<{id: number, url: string}[]>{
		const stmt = this.db.prepare('SELECT id, url FROM rss;');
		const res = stmt.all();
		let ret: Awaited<ReturnType<SQLite['getRSSUrl']>> = [];
		for(const r of res) ret.push({id: r.id, url: r.url});
		return ret;
	}

	async addRSSUrl(url: string){
		const stmt = this.db.prepare('INSERT INTO rss (url) VALUES (?);');
		const tr = this.db.transaction(() => {
			stmt.run(url);
        });
		tr();
	}

	init(){
        try {
            this.db.exec('CREATE TABLE IF NOT EXISTS rss (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT);');
        } catch(e){
            if(process.env.NODE_ENV === 'development') throw e;
            return -1;
        }
    }
}