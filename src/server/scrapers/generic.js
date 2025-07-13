import fs from "fs";
import * as cheerio from "cheerio";
import ifc from "../../core/interfaces/interfaces.js";

const EngineParser = class {
    engineName;
    searchUri;

    getTextOptionsDefaults = {
        nocache: false,
        recache: false,
        refresh: false
    };

    getRandomUserAgent() {
        return "Mozilla/5.0 (X11; Linux x86_64; rv:138.0) Gecko/20100101 Firefox/138.0";
    }

    genHeaders() {
        const { useragent, cookie, referer } = arguments?.[0] || {};
        let headers = {
            "User-Agent": useragent || this.getRandomUserAgent(),
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Upgrade-Insecure-Requests": "1",

            "Cookie": cookie || "",

            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": referer ? "cross-origin" : "none",
            "Sec-Fetch-User": "?1",
        };
        if (referer) headers["Referer"] = referer;
        return headers;
    }

    getText(query, options = {}) {
        if (typeof query !== "string") {
            throw new Error(`Metazoa.EngineParser.getText: Query is not a string. Invalid type: ${typeof query}. ${String(query)}`);
        }
        const q = encodeURIComponent(query.toLowerCase());

        const nocache = !!options.nocache ?? this.getTextOptionsDefaults.nocache;
        const recache = !!options.recache ?? this.getTextOptionsDefaults.recache;
        let   refresh = !!options.refresh ?? this.getTextOptionsDefaults.refresh;
        //refresh = true;

        const images = !!options.images ?? false;

        // temporary cache location. this is not how caching will work in the future. it will all be a database
        const cacheFile = `./cache/${this.engineName}-${images?'images':'articles'}-${q}`;

        return new Promise(async (resolve, reject) => {
            let cacheFileExists = await fs.promises.access(cacheFile).then(() => true).catch(() => false);
            if (!refresh && cacheFileExists) {
                try {
                    console.log(`Metazoa.EngineParser.getText: Loading from cache file ${cacheFile}`);
                    const cache = await fs.promises.readFile(cacheFile, "utf-8");
                    resolve({ html: cache, parse: () => this.parseText(cache) });
                } catch (e) {
                    console.error("Metazoa.EngineParser.getText: Error reading cache file.", e);
                }
            }
            try {
                console.log(`Metazoa.EngineParser.getText: Fetching from ${this.engineName} ${images?"images":'articles'} with query ${q}`);
                const url = (images ? this.imageSearchUri : this.searchUri).replace("%", q);
                const headers = this.genHeaders({
                    cookie: this.engineName === "google" ? process.env.GOOGLE_COOKIE : ""
                });

                const request = await fetch(url, { headers });
                const html = await (request).text();
                
                if (recache || !cacheFileExists) {
                    console.log(`Metazoa.EngineParser.getText: Writing to cache file ${cacheFile}`);
                    await fs.promises.writeFile(cacheFile, html, "utf8")
                    .catch(e => console.error("Metazoa.EngineParser.getText: Error writing cache file.", e));
                }

                resolve({
                    html: html,
                    parse: () => this.parseText(html)
                });
            } catch (e) { reject(e); }
        });
    }

    _getText(queries, useragent) {
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
        //console.log(`Metazoa.EngineParser.getSuggestions: Fetching suggestions from ${this.engineName} for: "${q}"`);
        return new Promise((resolve,reject) => {
            fetch(this.suggestUri.replace("%s", q)).then(d => d.json())
            .then(d => {
                const s = [];
                for (const i in d[1]) {
                    if (d[1][i] === q) {
                        //console.log(`Metazoa.EngineParser.getSuggestions: Suggestion ${i} from ${this.engineName} same as input "${q}". Omitting`);
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
                resolve(s);
            });
        });
    }

    parseText(html) {
        throw new Error("Metazoa.EngineParser.parseText: Parser should be implemented by subclass.");
    }
};

export default EngineParser;
