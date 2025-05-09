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
            d[1].forEach(r => {
                s.push([r, [this.engineName]]);
            });
            return s;
        });
    }

    parseText(html) {
        throw new Error("Metazoa.EngineParser.parseText: Parser should be implemented by subclass.");
    }
};

GoogleParser = class extends EngineParser {
    engineName = "google";
    searchUri = "https://www.google.com/search?q=%s";
    imageSearchUri = "https://www.google.com/search?tbm=isch&q=%s";
    suggestUri = "http://suggestqueries.google.com/complete/search?output=firefox&q=%s";

    parseText(htm) {
        const $ = cheerio.load(htm);

        // BREAKS CACHING AND USERAGENT
        (async () => {
        const queries = {};
        const fa = $("a");
        if (fa.text().match(/click here/i)) {
            console.log("bingus found!");
            queries.recache = queries.recache ?? 1;
            queries.q = fa.prop("href").replace("/search?q=", "");
            htm = (await this.getText(queries)).html;
            //console.log(queries)
            //console.log(htm)
        }
        })();

        const r = [];
        
        try {

        const rso = $("#rso");
        const ov = $("#kp-wp-tab-cont-overview"); 
        const divs = $("div+div");
        if (rso.length > 0) {
            console.log("Metazoa.GoogleParser: #rso detected. Using #rso parser.");
            const divs = $(".MjjYud");
            let i = 0;
            divs.each((j, el) => {
                const ttl = divs.find("h3").text();
                const href = divs.find("a:has(h3)").attr("href");
                const dsc = divs.find(".VwiC3b").text();

                const tr = new ifc.TextArticle(href, ttl);
                tr.addDescription(dsc, this.engineName);
                tr.addEngine(this.engineName, ++i);
                r.push(tr);
            });
            return r;
        }
        else
        if (ov.length > 0) {
            console.warn(
                "Metazoa.GoogleParser: Overview section detected. " +
                "No parser for ov (#kp-wp-tab-cont-overview). Consider adding support for this layout."
            );
            return [];
        }
        else {
            console.log("Metazoa.GoogleParser: Defaulting to (last resort) div+div parser.");

            let i = 0;
            divs.each((j, el) => {
                const a = $(el).find("a:has(h3)");
                if (!a.length) return;
                let href = a.attr("href");
                if (!href.startsWith("/url?q=")) return;
                href = decodeURIComponent(href.substring(7, href.indexOf("&sa=")));
                
                const ttl = a.find("h3").text().trim();
                const dsc = $(el).next().text().trim();

                const tr = new ifc.TextArticle(href, ttl);
                tr.addDescription(dsc, this.engineName);
                tr.addEngine(this.engineName, ++i);
                r.push(tr);
                //console.log(tr);
                
            });
        }
        if (r.length < 1) {
            console.warn("Metazoa.GoogleParser: Warning, results are empty for an unknown reason.");
        }
        return r;
        } catch (err) {
            console.error("Metazoa.GoogleParser: Error parsing result", err);
        }
    }

    parseImages(htm) {
        const r = [];
        const $ = cheerio.load(htm);
        const imgs = $("table .RntSmf");
        let i = 0;
        imgs.each((j,tab) => {
            const t = $(tab);
            const src = t.find("img").attr("src");
            const ttl = t.find(".qXLe6d.x3G5ab").text().trim();
            let href = t.find("a:has(img)").attr("href");
            if (!href.startsWith("/url?q=")) return;
            href = decodeURIComponent(href.substring(7, href.indexOf("&sa=")));
            const ir = new ifc.ImageArticle(href, ttl, src);
            ir.addEngine(this.engineName, ++i);
            r.push(ir);
        });
        return r;
    }
};

DdgParser = class extends EngineParser {
    engineName = "ddg";
    searchUri = "https://lite.duckduckgo.com/lite/?q=%s";
    imageSearchUri = "https://duckduckgo.com/?q=%s&iax=images&ia=images";
    suggestUri = "https://duckduckgo.com/ac/?q=%s&type=list";

    parseText(htm) {
        const $ = cheerio.load(htm);
        const fel = $(".filters");
        if (!fel) {
            console.error("Metazoa.DdgParser: Could not find expected '.filters' element.");
            return [];
        }

        const anchors = fel.find("tbody tr:not(.result-sponsored) .result-link");
        const r = [];
        let i = 0;
        anchors.each((j, el) => {
            const a = $(el);
            let href = a.attr("href");
            href = decodeURIComponent(href.substring(href.indexOf("?uddg=")+6, href.indexOf("&rut=")));

            const dsc = a.closest("tr").next().text().trim();
            const ttl = a.text().trim();

            const tr = new ifc.TextArticle(href, ttl);
            tr.addDescription(dsc, this.engineName);
            tr.addEngine("ddg", ++i);
            r.push(tr);
        });

        return r.reverse(); // Reverse order to match PHP implementation.
    }
};

BingParser = class extends EngineParser {
    engineName = "bing";
    searchUri = "https://www.bing.com/search?q=%s";
    imageSearchUri="https://www.bing.com/images/search?q=%s&form=HDRSC3&first=1"

    parseText(htm) {
        const $ = cheerio.load(htm);
        const rl = $("ol#b_results li.b_algo");
        const r = [];
        
        let i = 0;
        rl.each((j, el) => {
            const e = $(el);
            const a = e.find("h2 a");
            const dsc = e.find("p").text().trim();

            if (a.length) {
                const href = a.attr("href");
                const ttl = a.text().trim();

                const tr = new ifc.TextArticle(href, ttl);
                tr.addDescription(dsc, this.engineName);
                tr.addEngine(this.engineName, ++i);
                r.push(tr);
            }
        });

        return r;
    }

    parseImages(htm) {
        const $ = cheerio.load(htm);
        const r = [];
        const imgs = $("[data-idx]:has(img)");
        let i = 0;
        imgs.each((j, el) => {
            const e = $(el);
            const href= e.find(".img_info a").attr("href");
            const ttl = e.find(".b_dataList a").attr("title")?.trim();
            const src = (e.find("img").attr("src")||e.find("img").attr("data-src"))?.replace(/\?.+$/,'');

            if (!src.startsWith("http")) return;

            const ir = new ifc.ImageArticle(href, ttl, src);
            ir.addEngine(this.engineName, ++i);
            r.push(ir);
        });
        return r;
    }
};

BraveParser = class extends EngineParser {
    engineName = "brave";
    searchUri = "";
    suggestUri = "https://search.brave.com/api/suggest?q=%s&rich=true&source=web";

    getSuggestions(q) {
        console.log(`Metazoa.BraveParser.getSuggestions: Fetching suggestions from ${this.engineName} for: "${q}"`);
        return fetch(this.suggestUri.replace("%s", q)).then(d => d.json())
        .then(d => {
            const s = [];
            d[1].forEach(r => {
                s.push([r.q, [this.engineName], {
                    // !Extra content provided by engine
                }]);
            });
            return s;
        });
    }
}

module.exports = {
    EngineParser,
    GoogleParser,
    BraveParser,
    DdgParser,
    BingParser
}
