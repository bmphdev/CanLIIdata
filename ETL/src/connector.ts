import { Logger } from "./logger.js"
import { throwError } from "./logger.js"
import { promises as fs } from "fs"

type apiLang = "en" | "fr"
type databaseInfo = {
    databaseId: string,
    jurisdiction: string,
    name: string,
    url: URL
}
type caseInfo = {
    databaseId: string,
    caseId: {en: string},
    title: string,
    citation: string
}
type caseMetadata = {
    databaseId: string,
    caseId: string,
    url: URL,
    title: string,
    citation: string,
    language: apiLang,
    docketNumber: string,
    decisionDate: Date,
    keywords: string,
    topics: string,
    concatenatedId: string
}

class CanliiApi {
    static #baseUrl = new URL("https://api.canlii.org/v1/")
    #thisApiKey: string
    #thisLog: Logger
    #thisCallId: number
    constructor(aKey: string, aLogger: Logger) {
        this.#thisApiKey = aKey
        this.#thisLog = aLogger
        this.#thisCallId = 0
    }
    #call = async (aPath: string): Promise<any> => {
        let myUrl = new URL(aPath, CanliiApi.#baseUrl)
        let myCallId = this.#thisCallId++
        this.#thisLog.info("Call #" + myCallId + ". Calling API with URL: " + myUrl + "...")
        myUrl.searchParams.append("api_key", this.#thisApiKey)
        let myResponse = await fetch(myUrl)
                            .then((aResponse) => aResponse.ok ? 
                                                    aResponse.json()
                                                    : Promise.reject(aResponse.status + " " + aResponse.statusText))
        this.#thisLog.info("Call #" + myCallId + ". Response received. Message length: " + JSON.stringify(myResponse).length + ".")
        this.#thisLog.debug("Call #" + myCallId + ". Message: " + JSON.stringify(myResponse))
        return myResponse
    }
    browseDatabases = (aLang: apiLang): Promise<{caseDatabases: Array<databaseInfo>}> => {
        let myPath = "caseBrowse/" + aLang + "/"
        return this.#call(myPath)
    }
    browseCases = (aLang: apiLang) => async (aDB: string): Promise<{cases: Array<caseInfo>}> => {
        let maxCount = 10000
        let retrieveMore = (aPath: string) => async (anOffset: number): Promise<Array<caseInfo>> => {
            let myPath = aPath + anOffset
            let myResult = await this.#call(myPath)
            return myResult.cases.length == 0 ? [] : myResult.cases.concat(await retrieveMore(aPath)(anOffset + maxCount))
        }
        let myPath = "caseBrowse/" + aLang + "/" + aDB + "/?resultCount=10000&offset="
        this.#thisLog.info("Retrieving case list for DB '" + aDB + "'...")
        let myArray = await retrieveMore(myPath)(0)
        this.#thisLog.info("Case list received. Total length: " + myArray.length + ".")
        return {cases: myArray}
    }
    browseMetadata = (aLang: apiLang) => (aDB: string) => (aCase: string): Promise<caseMetadata> => {
        let myPath = "caseBrowse/" + aLang + "/" + aDB + "/" + aCase + "/"
        return this.#call(myPath)
    }
}

// Tests
const connectedTest = async () => {
    const myLog = new Logger("./target/test.log", "DEBUG")
    const mySecretFile = process.argv[2] ?? throwError("Argument not received. Expecting path to secret file.")
    myLog.info("Secret file: " + mySecretFile)
    const myfile = await fs.readFile(mySecretFile, "utf-8") ?? throwError("Could not read secret file.")
    const myApiKey: string = (JSON.parse(myfile)).api_key
    let myCanlii = new CanliiApi(myApiKey, myLog)
    await myCanlii.browseDatabases("en")
            .then((aJson) => fs.writeFile("./target/browseDatabasesAnswer.json", JSON.stringify(aJson)))
            .catch((err) => console.log("Error: " + err))
    await myCanlii.browseCases("en")("onltb")
            .then((aJson) => fs.writeFile("./target/browseCasesAnswer.json", JSON.stringify(aJson)))
            .catch((err) => console.log("Error: " + err))
    await myCanlii.browseMetadata("en")("onltb")("2011canlii23787")
            .then((aJson) => fs.writeFile("./target/browseMetadataAnswer.json", JSON.stringify(aJson)))
            .catch((err) => console.log("Error: " + err))
    await myCanlii.browseCases("en")("TESTTESTTEST")
            .catch((err) => console.log("Error: " + err))
}
// If this file is being called directly, run the test. Otherwise, ignore.
import.meta.url.endsWith(process.argv[1] ?? throwError("command line not found")) ? connectedTest() : {}

// Mock API for testing
class MockCanliiApi extends CanliiApi {
    isSuccessful: boolean
    constructor(aKey: string, aLogger: Logger, isSuccessful?: boolean) {
        super(aKey, aLogger)
        this.isSuccessful = isSuccessful ?? true
    }
    #call = undefined
    browseDatabases = (aLang: apiLang): Promise<{caseDatabases: Array<databaseInfo>}> =>
        this.isSuccessful ?
        fs.readFile("./resources/browseDatabasesAnswer.json").then((res) => JSON.parse(res.toLocaleString()))
        : Promise.reject("4Q4 Not Found")
    browseCases = (aLang: apiLang) => async (aDB: string): Promise<{cases: Array<caseInfo>}> =>
        this.isSuccessful ?
        fs.readFile("./resources/browseCasesAnswer.json").then((res) => JSON.parse(res.toLocaleString()))
        : Promise.reject("4Q4 Not Found")
    browseMetadata = (aLang: apiLang) => (aDB: string) => (aCase: string): Promise<caseMetadata> =>
        this.isSuccessful ?
        fs.readFile("./resources/browseMetadataAnswer.json").then((res) => JSON.parse(res.toLocaleString()))
        : Promise.reject("4Q4 Not Found")
}


export {
    CanliiApi as default,
    MockCanliiApi
}

