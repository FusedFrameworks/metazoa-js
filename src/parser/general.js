const fs = require("fs");
const cheerio = require("cheerio");
const ifc = require("../interfaces/interfaces.js");

EngineParser = class {
    engineName;
    searchUri;

    getText(queries, useragent) {
        const nocache = queries["nocache"] ?? false;
        const recache = queries["recache"] ?? false;
        const refresh = queries["refresh"] ?? recache;
        if (typeof queries["q"] !== "string") {
            throw new Error("Metazoa.EngineParser.getText: Query is not a string", String(queries["q"]));
        }
        const q = encodeURIComponent(queries["q"].toLowerCase());
        
        //const cacheFile = `${Metazoa.CACHE_LOCATION}/${this.engineName}-${queries.images?'images':'articles'}-${q}`;
        const cacheFile = `./cache/${this.engineName}-${queries.images?'images':'articles'}-${q}`;


        return new Promise(async (resolve, reject) => {
            let cacheFileExists = await fs.promises.access(cacheFile).then(() => true).catch(() => false);
            if (!refresh && cacheFileExists) {
                try {
                    console.log(`Metazoa.EngineParser.getText: Loading from cache file ${cacheFile}`);
                    const cache = await fs.promises.readFile(cacheFile, "utf-8");
                    resolve({
                        html: cache,
                        parse: () => this.parseText(cache)
                    });
                    return;
                } catch (e) {
                    console.error("Metazoa.EngineParser.getText: Error reading cache file.", e);
                }
            }

            try {
                console.log(`Metazoa.EngineParser.getText: Fetching from ${this.engineName} ${queries.images?"images":'articles'} with query ${queries.q}`);
                const url = (queries.images ? this.imageSearchUri : this.searchUri).replace("%", q);
                const headers = {};
                if (useragent) headers["User-Agent"] = useragent; 
                headers["Cookie"] = process.env.GOOGLE_COOKIE;
                
                //console.log(headers["Cookie"])
                //
                const req = await fetch(url, { headers });
                const htm = await (req).text();

                //console.log("headers", req.headers);
                //throw new Error("ouch");

                if (recache || !cacheFileExists) {
                    console.log(`Metazoa.EngineParser.getText: Writing to cache file ${cacheFile}`);
                    await fs.promises.writeFile(cacheFile, htm, "utf8")
                    .catch(e => console.error("Metazoa.EngineParser.getText: Error writing cache file.", e));
                }

                resolve({
                    html: htm,
                    parse: () => this.parseText(htm)
                });
            } catch(e) { reject(e); }
        });
    }

    async getImages(queries, useragent) {
        queries.images = true;
        const htm = (await this.getText(queries, useragent)).html;
        return {
            html: htm,
            parse: () => this.parseImages(htm)
        };
    }

    getSuggestions(q) {
        console.log(`Metazoa.EngineParser.getSuggestions: Fetching suggestions from ${this.engineName} for: "${q}"`);
        return fetch(this.suggestUri.replace("%s", q)).then(d => d.json())
        .then(d => {
            const s = [];
            for (const i in d[1]) {
                if (d[1][i] === q) {
                    console.log(`Metazoa.EngineParser.getSuggestions: Suggestion ${i} from ${this.engineName} same as input "${q}". Omitting`);
                    continue;
                }
                s.push({
                    q: d[1][i],
                    e: [ { name: this.engineName, short: this.shortName, place: i } ],
                    extras: {
                        // TODO: Brave had extra content in suggestions, like descriptions/images
                    }
                });
            }
            return s;
        });
    }

    parseText(html) {
        throw new Error("Metazoa.EngineParser.parseText: Parser should be implemented by subclass.");
    }
};

module.exports = EngineParser;
