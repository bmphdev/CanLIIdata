import { throwError } from "./logger.js"
import { Logger } from "./logger.js"
import { logLevel } from "./logger.js"
import CanliiApi from "./connector.js"
import {MockCanliiApi as MockApi} from "./connector.js"
import {PathLike, promises as fs} from "fs"
import Db from "./db.js"
import { MockDb } from "./db.js"
import type { apiLang, caseInfo } from "./connector.ts"


class CaseRecord {
    court: string = ""
    caseId: string = ""
    caseInfo: any
    caseMetadata: any
}

class CanliiData {
    #thisConnector: CanliiApi
    #thisDb: Db<CaseRecord>
    #thisLang: apiLang
    #thisLog: Logger
    constructor(aConnector: CanliiApi, aDb: Db<CaseRecord>, aLang: apiLang, aLogger: Logger) {
        this.#thisConnector = aConnector
        this.#thisDb = aDb
        this.#thisLang = aLang
        this.#thisLog = aLogger
    }

    #createRecord = (aCase: caseInfo) => {
        return {court: aCase.databaseId, caseId: ("en" in aCase.caseId) ? aCase.caseId.en : aCase.caseId.fr , caseInfo: aCase, caseMetadata: undefined}
    }

    migrateCases = async (aCourt: string) => {
        if (await this.#thisDb.isDbEmpty())
            this.#thisConnector.browseCases(this.#thisLang)(aCourt)
            .then(aCaseList => aCaseList.cases.map(this.#createRecord)
                                                .forEach(async aRecord => await this.#thisDb.insertRow(aRecord)))
    }

    backfillMetadata = async () => {
        let myRecord = await this.#thisDb.findPartialRecord("caseMetadata")
        if (myRecord != undefined)
            await this.#thisConnector.browseMetadata(this.#thisLang)(myRecord.court)(myRecord.caseId)
                    .then(async aMetadata => await this.#thisDb.updateRecord("caseMetadata")(aMetadata)("caseId")(myRecord.caseId))
                    .then(this.backfillMetadata)
        else this.#thisLog.info("Metadata backfill completed.")
    }
}


const main = (aSettingsFile: PathLike) => (aSecretFile: PathLike) => async (aParameter: "--test" | string) => {
    const {db_file: myDbFile, log_file: myLogFile, log_level: myLogLevel} = await fs.readFile(aSettingsFile, "utf-8")
                                                                                    .then(JSON.parse) as {db_file: string, log_file: PathLike, log_level: logLevel}
    const {api_key: myKey} = await fs.readFile(aSecretFile, "utf-8")
                                    .then(JSON.parse) as {api_key: string}
    const myLog = new Logger(myLogFile, myLogLevel)
    myLog.info("Starting processing with log file " + myLogFile + ", log level " + myLogLevel + ", DB file " + myDbFile + " and API key [***]")
    const myConnectorClass: typeof CanliiApi = aParameter == "--test" ? MockApi : CanliiApi
    const myDbClass: typeof Db = aParameter == "--test" ? MockDb : Db
    const myConnector = new myConnectorClass(myKey, myLog)
    const myDb = new myDbClass<CaseRecord>(myDbFile, myLog, {name: "cases", row: CaseRecord})
    const myCanliidata = new CanliiData(myConnector, myDb, "en", myLog)
    await myCanliidata.migrateCases(aParameter)
    .then(myCanliidata.backfillMetadata)
} 

main(process.argv[2] ?? throwError("Settings file not provided"))
    (process.argv[3] ?? throwError("Secret file not provided"))
    (process.argv[4] ?? "")
