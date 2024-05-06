import * as assert from "assert"
import CanliiApi from "./connector.js"
import {test as apiTest} from "./connector.js"
import {promises as fs} from "fs"

const secretFile = process.argv[2]
assert.ok(secretFile)
const myfile = await fs.readFile(secretFile, "utf-8")
assert.ok(myfile)
const api_key: string = (JSON.parse(myfile)).api_key

// Tests
apiTest(api_key)
