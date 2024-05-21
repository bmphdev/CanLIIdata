import { throwError } from "./logger.js"
import { Logger } from "./logger.js"
import { logLevel } from "./logger.js"
import CanliiApi from "./connector.js"
import {MockCanliiApi as MockApi} from "./connector.js"
import {PathLike, promises as fs} from "fs"
import Db from "./db.js"
import { MockDb } from "./db.js"


const main = (aConnectorClass: typeof CanliiApi) => (aSettingsFile: PathLike) => async (aSecretFile: PathLike) => {
    const {db_file: myDbFile, log_file: myLogFile, log_level: myLogLevel} = await fs.readFile(aSettingsFile, "utf-8")
                                                                                    .then(JSON.parse) as {db_file: string, log_file: PathLike, log_level: logLevel}
    const {api_key: myKey} = await fs.readFile(aSecretFile, "utf-8")
                                    .then(JSON.parse) as {api_key: string}
    const myLog = new Logger(myLogFile, myLogLevel)
    myLog.info("Starting processing with log file " + myLogFile + ", log level " + myLogLevel + ", DB file " + myDbFile + " and API key [***]")
    const myConnector = new aConnectorClass(myKey, myLog)
    await myConnector.browseDatabases("en").then(console.log)
    await myConnector.browseCases("en")("test").then(console.log)
    await myConnector.browseMetadata("en")("test")("testotest").then(console.log)
    const myTableDesc = {
        name: "cases_table",
        row: class{
            court: string = ""
            case_id: string = ""
            case_info: any = {}
            case_metadata: any = {}
        }
    }
    const myDb = new MockDb(myDbFile, myLog, myTableDesc)
    await myDb.readAll()
} 

main(process.argv[4] === "--test" ? MockApi : CanliiApi)
    (process.argv[2] ?? throwError("Settings file not provided"))
    (process.argv[3] ?? "Secret file not provided")
