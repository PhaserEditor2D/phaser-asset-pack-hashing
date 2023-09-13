import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { dirname, join, relative } from "path";
import { exit } from "process";
import md5FileSync from "md5-file";

export class AssetPackProcessor {

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

    async start(processJs) {

        console.log("")
        console.log("# Processing Asset Pack files")
        console.log("")

        await this.#processDirectory(this.#rootDir)

        if (processJs) {

            await this.#processJavaScriptFiles()
        }
    }

    async #processJavaScriptFiles() {

        console.log("")
        console.log("# Processing JavaScript files")
        console.log("")

        await this.#processJsFiles(this.#rootDir)
    }

    async #processJsFiles(currentDir) {

        const hashMap = new Map()

        for (const url of this.#packUrls) {

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

    /**
     * Scan the given directory for pack files and process them.
     * 
     * @param {string} dir 
     */
    async #processDirectory(dir) {

        for (const name of readdirSync(dir)) {

            const fullName = join(dir, name)

            const stat = statSync(fullName)

            if (stat.isDirectory()) {

                await this.#processDirectory(fullName)

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

                            const { type } = config;

                            if (type === "multiatlas") {

                                await this.#processMultiAtlas(config)

                            } else if (type === "spineAtlas") {

                                this.#processSpineAtlas(config)
                            }

                            await this.#processConfigField(config, "url")

                            await this.#processConfigField(config, "urls")

                            await this.#processConfigField(config, "atlasURL")

                            await this.#processConfigField(config, "textureURL")

                            await this.#processConfigField(config, "fontDataURL")

                            await this.#processConfigField(config, "jsonURL")

                            await this.#processConfigField(config, "audioURL")

                            await this.#processConfigField(config, "objURL")

                            await this.#processConfigField(config, "matURL")
                        }
                    }

                    console.log(`- Writing Pack '${relative(this.#rootDir, fullName)}'`)

                    writeFileSync(fullName, JSON.stringify(packData))
                }
            }
        }
    }

    async #processMultiAtlas(config) {

        const path = config.path
        const atlasJsonFile = join(this.#rootDir, config.url)

        if (this.#visited.has(atlasJsonFile)) {

            return
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

        console.log(`  * Writing MultiAtlas '${relative(this.#rootDir, atlasJsonFile)}'`)

        writeFileSync(atlasJsonFile, JSON.stringify(atlasData))
    }

    async #processSpineAtlas(config) {

        const atlasFile = join(this.#rootDir, config.url)

        if (this.#visited.has(atlasFile)) {

            return
        }

        this.#visited.add(atlasFile)

        const atlasContent = readFileSync(atlasFile).toString()

        const lines = atlasContent.split(/\r\n|\r|\n/);

        const imageName = lines[0];
        const imageFile = join(dirname(atlasFile), imageName);

        if (!existsSync(imageFile)) {

            throw new Error(`File not found '${imageFile}'`)
        }

        const hash = await md5FileSync(imageFile)
        const newImageName = `${imageName}?h=${hash}`

        lines[0] = newImageName
        const output = lines.join("\n")

        console.log(`  * Writing SpineAtlas '${relative(this.#rootDir, atlasFile)}'`)

        writeFileSync(atlasFile, output)
    }

    /**
     * Convert a field of an entry configuration.
     * 
     * @param {any} config 
     * @param {string} field 
     */
    async #processConfigField(config, field) {

        const url_urls = config[field]

        if (typeof url_urls === "string") {

            config[field] = await this.#convertUrl(url_urls)

        } if (Array.isArray(url_urls)) {

            const urls = []

            for (const u of url_urls) {

                urls.push(await this.#convertUrl(u))
            }

            config[field] = urls
        }
    }

    /**
     * Appends the hash to the url.
     * 
     * @param {string} url 
     * @returns {Promise<string>} The url plush a its content hash.
     */
    async #convertUrl(url) {

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

