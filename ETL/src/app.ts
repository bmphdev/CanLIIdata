import { throwError } from "./logger.js"
import { Logger } from "./logger.js"
import CanliiApi from "./connector.js"
import {MockCanliiApi as MockApi} from "./connector.js"
import {promises as fs} from "fs"
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

 
const log = new Logger("./target/service.log", "DEBUG")
const secretFile = process.argv[2] ?? throwError("Argument not received. Expecting path to secret file.")
log.info("Secret file: " + secretFile)
const myfile = await fs.readFile(secretFile, "utf-8") ?? throwError("Could not read secret file.")
const api_key: string = (JSON.parse(myfile)).api_key
const myConnector = new MockApi(api_key, log)
await myConnector.browseDatabases("en").then(console.log)
await myConnector.browseCases("en")("test").then(console.log)
await myConnector.browseMetadata("en")("test")("testotest").then(console.log)
myConnector.isSuccessful = false
await myConnector.browseDatabases("en").catch((err) => console.log(err))

//const db = new Database("./target/db.db")
//db.exec("create table TBL (COL text)")
//db.exec("insert into TBL values ('TEST')")
//db.close

const db = await open({filename: "./target/db.db", driver: sqlite3.Database})
console.log(await db.get<string>("select * from TBL"))

// Tests
//apiTest(api_key, log)
