import * as assert from "assert"

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

const CanliiApi = class {
    static #baseUrl = new URL("https://api.canlii.org/v1/")
    #thisApiKey: string = ""   
    static build = (aKey: string) => {
        let myCanlii = new CanliiApi()
        myCanlii.#thisApiKey = aKey
        return myCanlii
    }
    #call = async (aPath: string) => {
        let myUrl = new URL(aPath, CanliiApi.#baseUrl)
        myUrl.searchParams.append("api_key", this.#thisApiKey)
        let myResponse = await fetch(myUrl).then((aResponse) => aResponse.text())
        return JSON.parse(myResponse)
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
            assert.ok(myResult.cases, "Found " + JSON.stringify(myResult))
            return myResult.cases.length == 0 ? [] : myResult.cases.concat(await retrieveMore(aPath)(anOffset + maxCount))
        }
        let myPath = "caseBrowse/" + aLang + "/" + aDB + "/?resultCount=10000&offset="
        let myArray = await retrieveMore(myPath)(0)
        return {cases: myArray}
    }
    browseMetadata = (aLang: apiLang) => (aDB: string) => (aCase: string): Promise<caseMetadata> => {
        let myPath = "caseBrowse/" + aLang + "/" + aDB + "/" + aCase + "/"
        return this.#call(myPath)
    }
}

// Tests
const test = (aKey: string) => {
    let myCanlii = CanliiApi.build(aKey)
    myCanlii.browseDatabases("en").then((aJson) => console.log(aJson.caseDatabases[0] ? "URL of 1st db: " + aJson.caseDatabases[0].url : "No db found"))
    myCanlii.browseCases("en")("onltb").then((aJson) => console.log("Nb cases in LTB: " + aJson.cases.length))
}

export {
    CanliiApi as default,
    test
}



//TODO: secret management -> done
//TODO: mock
//TODO: logging
