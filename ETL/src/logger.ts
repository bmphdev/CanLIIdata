import {PathLike, promises as fs} from "fs"

export type logLevel = "DEBUG" | "INFO" | "WARN" | "ERROR"

export const throwError = (aMessage: string): never => {
    throw new Error(aMessage)
}

export class Logger {
    #thisFile: PathLike = ""
    #thisLevel: logLevel = "DEBUG"
    constructor(aPath: PathLike, aLevel: logLevel) {
        this.#thisFile = aPath
        this.#thisLevel = aLevel
    }
    #writeEntry = (aLevel: logLevel) => (aMessage: string) => {
        let myCaller = (new Error()).stack?.split("\n")[3]?.split("/")?.slice(-1)[0]?.split(":")[0] ?? "(Caller not found)"
        let myEntry = new Date().toLocaleString() + " [" + aLevel + "] " + myCaller + " - " + aMessage
        console.log(myEntry)
        fs.appendFile(this.#thisFile, myEntry + "\n")
    }
    #ignore = (aMessage: string) => {}
    debug = (aMessage: string) => ["DEBUG"].includes(this.#thisLevel) ? this.#writeEntry("DEBUG")(aMessage) : this.#ignore(aMessage)
    info = (aMessage: string) => ["DEBUG", "INFO"].includes(this.#thisLevel) ? this.#writeEntry("INFO")(aMessage) : this.#ignore(aMessage)
    warn = (aMessage: string) => ["DEBUG", "INFO", "WARN"].includes(this.#thisLevel) ? this.#writeEntry("WARN")(aMessage) : this.#ignore(aMessage)
    error = (aMessage: string) => this.#writeEntry("ERROR")(aMessage)
}