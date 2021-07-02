#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "fs"
import { argv } from "process"
import { PackTransformer } from "./lib.js"

const [, , rootDir] = argv

if (!rootDir) {

    console.log("Missing root directory.")

    process.exit()
}

if (!existsSync(rootDir)) {

    console.log(`File not found '${rootDir}'.`)
}

const transformer = new PackTransformer(rootDir)

await transformer.start()

await transformer.replacePackUrlInJavaScriptFiles();
