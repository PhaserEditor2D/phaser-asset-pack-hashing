#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "fs"
import { argv, exit } from "process"
import { PackTransformer } from "./index.js"
import commandLineArgs from "command-line-args"
import commandLineUsage from "command-line-usage"

const args = commandLineArgs([
    { name: "root", alias: "r", type: String, multiple: false },
    { name: "js", alias: "j", type: Boolean, defaultValue: false },
    { name: "help", alias: "h", type: Boolean, defaultValue: false }
])

if (args["help"] || args["root"] === undefined) {

    const usage = commandLineUsage([{
        header: "Phaser Asset Pack Hashing",
        content: "A script for hashing the URLs of Asset Pack files."
    }, {
        header: "Options",
        optionList: [
            {
                name: "root",
                alias: "r",
                typeLabel: "<directory>",
                description: "Root directory of the game."
            },
            {
                name: "js",
                alias: "j",
                type: {
                    name: "boolean",
                },
                description: "Enable JavaScript processing."
            }
        ]
    }])

    console.log(usage)

    exit(0)
}

const rootDir = args["root"]
const processJs = args["js"]

if (!existsSync(rootDir)) {

    console.log(`File not found '${rootDir}'.`)

    exit(1)
}

const transformer = new PackTransformer(rootDir)

await transformer.start()

if (processJs) {

    await transformer.replacePackUrlInJavaScriptFiles()
}
