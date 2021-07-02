import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { exit } from "process";
import md5FileSync from "md5-file";

export class PackTransformer {

    /** @type {string} */
    #rootDir;

    /** @type {Set<string>} */
    #visited;

    /** @type {string[]} */
    #packUrls;

    constructor(rootDir) {

        this.#rootDir = rootDir;
        this.#visited = new Set();
        this.#packUrls = [];
    }

    async start() {

        console.log("")
        console.log("# Processing Asset Pack files")
        console.log("")

        await this.#processPackFiles(this.#rootDir)
    }

    async replacePackUrlInJavaScriptFiles() {

        console.log("")
        console.log("# Processing JavaScript files")
        console.log("")

        await this.#processJsFiles(this.#rootDir)
    }

    async #processJsFiles(currentDir) {

        const hashMap = new Map()

        for(const url of this.#packUrls) {

            const hash = await md5FileSync(join(this.#rootDir, url))
            hashMap.set(url, hash)
        }

        for (const name of readdirSync(currentDir)) {

            const fullName = join(currentDir, name)

            const stat = statSync(fullName)

            if (stat.isDirectory()) {

                await this.#processJsFiles(fullName)

            } else if (fullName.endsWith(".js")) {

                const content = readFileSync(fullName).toString();
                let newContent = content;

                for (const url of this.#packUrls) {

                    const hash = hashMap.get(url)
                    newContent = newContent.replace(url, `${url}?h=${hash}`)
                }

                if (content !== newContent) {

                    console.log(`- Writing JS ${relative(this.#rootDir, fullName)}`)

                    writeFileSync(fullName, newContent)
                }
            }
        }
    }

    async #processPackFiles(currentDir) {

        for (const name of readdirSync(currentDir)) {

            const fullName = join(currentDir, name)

            const stat = statSync(fullName)

            if (stat.isDirectory()) {

                await this.#processPackFiles(fullName)

            } else {

                if (fullName.endsWith(".json")) {

                    this.#packUrls.push(relative(this.#rootDir, fullName))

                    const packData = JSON.parse(readFileSync(fullName))

                    try {

                        if (packData.meta.contentType !== "phasereditor2d.pack.core.AssetContentType") {

                            continue;
                        }

                    } catch (e) {

                        continue;
                    }

                    for (const sectionKey of Object.keys(packData)) {

                        if (sectionKey === "meta") {

                            continue;
                        }

                        for (const config of packData[sectionKey].files) {

                            const { key, type } = config;

                            if (type === "multiatlas") {

                                const path = config.path
                                const atlasJsonFile = join(this.#rootDir, config.url)

                                if (this.#visited.has(atlasJsonFile)) {

                                    continue
                                }

                                this.#visited.add(atlasJsonFile)

                                const atlasData = JSON.parse(readFileSync(atlasJsonFile))

                                for (const textureData of atlasData.textures) {

                                    const imageName = textureData.image
                                    const imageFile = join(this.#rootDir, path, imageName)

                                    if (!existsSync(imageFile)) {

                                        throw new Error(`File not found '${imageFile}'`)
                                    }

                                    const hash = await md5FileSync(imageFile)
                                    const newImageName = `${imageName}?h=${hash}`

                                    textureData.image = newImageName
                                }

                                console.log(`  * Writing Multiatlas '${relative(this.#rootDir, atlasJsonFile)}'`)

                                writeFileSync(atlasJsonFile, JSON.stringify(atlasData))
                            }

                            if (config.url) {

                                config.url = await this.#processSimpleUrl(config.url)
                            }

                            if (config.atlasURL) {

                                config.atlasURL = await this.#processSimpleUrl(config.url)
                            }

                            if (config.textureURL) {

                                config.atlasURL = await this.#processSimpleUrl(config.url)
                            }
                        }
                    }

                    console.log(`- Writing Pack '${relative(this.#rootDir, fullName)}'`)

                    writeFileSync(fullName, JSON.stringify(packData))
                }
            }
        }
    }

    async #processSimpleUrl(url) {

        const file = join(this.#rootDir, url)

        if (existsSync(file)) {

            const hash = await md5FileSync(file)

            const newUrl = `${url}?h=${hash}`

            return newUrl

        } else {

            throw new Error(`File not found '${file}'`)
        }
    }
}

