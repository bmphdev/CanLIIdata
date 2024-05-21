import { Logger } from "./logger.js"
import { throwError } from "./logger.js"
import sqlite3 from 'sqlite3'
import { Database, ISqlite, open } from 'sqlite'

type tableDesc = {name: string, row: Object}

class Db<Row extends Object> {
    static #getCreateQuery = (aTableDesc: tableDesc) => "create table if not exists "
                                                        + aTableDesc.name
                                                        + " ("
                                                        + Object.keys(new (aTableDesc.row as any)()).join(", ")
                                                        + ", insertion_date date)"
    static #getInsertQuery = (aTableDesc: tableDesc) => "insert into "
                                                        + aTableDesc.name
                                                        + " ("
                                                        + Object.keys(new (aTableDesc.row as any)()).join(", ")
                                                        + ", insertion_date) values ("
                                                        + Object.keys(new (aTableDesc.row as any)()).map((aKey) => ":" + aKey).join(", ")
                                                        + ", :insertion_date)"
    static #getSelectQuery = (aTableDesc: tableDesc) => "select * from "
                                                        + aTableDesc.name
    #thisLog: Logger
    #thisDb: Promise<Database>
    #thisCreateQuery: ISqlite.SqlType
    #thisInsertQuery: ISqlite.SqlType
    #thisSelectQuery: ISqlite.SqlType
    constructor(aDbFile: string, aLogger: Logger, aTableDesc: tableDesc) {
        this.#thisLog = aLogger
        this.#thisCreateQuery = Db.#getCreateQuery(aTableDesc)
        this.#thisInsertQuery = Db.#getInsertQuery(aTableDesc)
        this.#thisSelectQuery = Db.#getSelectQuery(aTableDesc)
        this.#thisLog.info("CreateQuery: " + this.#thisCreateQuery)
        this.#thisLog.info("InsertQuery: " + this.#thisInsertQuery)
        this.#thisLog.info("Select query: " + this.#thisSelectQuery)
        sqlite3.verbose()
        this.#thisDb = open({filename: aDbFile, driver: sqlite3.Database})
                        .then(async (aDb) => {aDb.on("trace", console.log)
                                                return aDb})
                        .then(async (aDb) => {await aDb.run(this.#thisCreateQuery)
                                                return aDb})
    }
    insertRow = async (aRow: Row) => {
        let myMapping: any = {":insertion_date": new Date()}
        Object.entries(aRow).forEach(([aKey, aValue]) => {myMapping[":" + aKey] = JSON.stringify(aValue)})
        this.#thisLog.debug("Inserting values: " + JSON.stringify(myMapping)) ;
        (await this.#thisDb).run(this.#thisInsertQuery, myMapping)
    }
    readAll = async () => (await this.#thisDb).all<Row[]>(this.#thisSelectQuery)
}


const test = async () => {
    const myLog = new Logger("./target/test.log", "DEBUG")
    const myDbFile = "./target/test.db"
    class myRowClass{
        field1: string = "test"
        field3: object = {hello: "world"}
    }
    const myDb = new Db<myRowClass>(myDbFile, myLog, {name: "myTest", row: myRowClass})
    let myRow = new myRowClass()
    await myDb.insertRow(myRow)
            .then(myDb.readAll)
            .then((anArray) => anArray.forEach((aRow) => console.log(aRow.field1)))
}
// If this file is being called directly, run the test. Otherwise, ignore.
import.meta.url.endsWith(process.argv[1] ?? throwError("command line not found")) ? test() : {}

// Mock API for testing
class MockDb<Row extends Object> extends Db<Row> {
    constructor(aDbFile: string, aLogger: Logger, aTableDesc: tableDesc) {
        super("./target/mock.db", aLogger, aTableDesc)
    }
}

export {
    Db as default,
    MockDb
}
