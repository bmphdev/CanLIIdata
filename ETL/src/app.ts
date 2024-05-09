import { throwError } from "./logger.js"
import { Logger } from "./logger.js"
import CanliiApi from "./connector.js"
import {test as apiTest} from "./connector.js"
import {promises as fs} from "fs"

const log = new Logger("./target/service.log", "DEBUG")
const secretFile = process.argv[2] ?? throwError("Argument not received. Expecting path to secret file.")
log.info("Secret file: " + secretFile)
const myfile = await fs.readFile(secretFile, "utf-8") ?? throwError("Could not read secret file.")
const api_key: string = (JSON.parse(myfile)).api_key

// Tests
apiTest(api_key, log)
