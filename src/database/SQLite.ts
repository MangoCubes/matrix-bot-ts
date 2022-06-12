import DatabaseConstructor, { Database } from 'better-sqlite3';
export default class SQLite{
	db: Database;
	constructor(dir: string){
		this.db = new DatabaseConstructor(dir);
	}
	init(){
        try {
            
        } catch(e){
            if(process.env.NODE_ENV === 'development') throw e;
            return -1;
        }
    }
}