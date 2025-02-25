const fs = require("fs");
const cheerio = require("cheerio");
require('dotenv').config();

class Metazoa {
    static CACHE_LOCATION = process.env.CACHE_LOCATION || "./cache";

    static getIcon(domain) { 
        const defaultFavicon = "";
        if (!domain || typeof domain !== "string") {
            console.warn("Metazoa.getIcon: Invalid domain. Must be of type string.", domain);
            return defaultFavicon;
        }
        if(/[^a-z0-9-_.]/i.test(domain)) {
            console.warn("Metazoa.getIcon: Domain must only include alphanumeric, dots, and hyphens.", domain);
            return defaultFavicon;
        }
        if (!/\./.test(domain)) { 
            // For engine icons
            domain = {
                google: "google.com",
                ddg:    "duckduckgo.com",
                bing:   "bing.com",
                brave:  "brave.com"
            }[domain];
            if (!domain) {
                console.warn("Metazoa.getIcon: Unknown shortcut or domain.", domain);
                return defaultFavicon;
            }
        }
        return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    }

    static proxyImage(src) {
        // !TODO: Should return URL of proxied image
        console.warn("Metazoa.proxyImage: Unable to proxy images at this time. Consider implementing this feature?");
        console.error("Metazoa.proxyImage: Unable to proxy images at this time. Consider implementing this feature?");
        return src;
    }

    static quickSanitize(inp) {
        if (typeof inp !== "string") {
            console.warn("Metazoa.quickSanitize: Input was not a string. Coercing to string.");
            inp = String(inp);
        }
        return inp.replace(/[&<>"']/g, (char) => {
            const echars = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };
            return echars[char];
        });
    }

    static validateUrl(href) {
        try {
            const nhref = this.quickSanitize(href.trim()).replace(/^http(s|):\/\//, "https://");
            return new URL(nhref.startsWith("https://") ? nhref : "https://"+nhref);
        } catch (e) {
            console.error("Metazoa.validateURL: Invalid URL:", href);
            throw new Error("Metazoa.validateURL: Invalid URL provided.");
        }
    }
    
    static combineResults(resArr) {
        const combMap = new Map();
        resArr.forEach(r => {
            r.forEach(tr => {
                const { href, engines } = tr;
                if (!combMap.has(href)) {
                    combMap.set(href, tr);
                }
                const cr = combMap.get(href);
                cr.addDescription(tr.description, tr.descriptor);
                Object.entries(engines).forEach((e, i) => {
                    cr.addEngine(e, i);
                }); 
            });
        });

        const combArr = Array.from(combMap.values());
        combArr.sort((a,b) => {
            const aPlacement = Object.values(a.engines);
            const avgA = aPlacement.reduce((sum, val) => sum + val, 0) / aPlacement.length;
            const bPlacement = Object.values(b.engines);
            const avgB = bPlacement.reduce((sum, val) => sum + val, 0) / bPlacement.length;
            return avgA - avgB;
        });
        return combArr;
    }

    static combineSuggestions(sugArr) {
        const combMap = new Map();
        sugArr.forEach(s => {
            s.forEach(r => {
                const [q, engines] = r;
                if (!combMap.has(q)) {
                    combMap.set(q, r);
                }
                const cr = combMap.get(q);
                engines.forEach(e => {
                    if (cr[1].indexOf(e) >= 0) {
                        return;
                    }
                    cr[1].push(e);
                });
            });
        });
        const combArr = Array.from(combMap.values());
        combArr.sort((a,b) => {
            return (a[0].length - b[0].length) + (b[1].length - a[1].length);
        });
        return combArr;
    }
}

Metazoa.Description = class {
    text = "";
    engines = [];

    constructor(d, e) {
        this.text = d;
        this.engines = [e];
    }

    addEngine(e) {
        if (typeof e !== "string") throw new Error("Metazoa.Description.addEngine: Invalid input: engine must be of type string or object; received "+typeof e+".");
        for (let en of this.engines) { if (en === e) return; }
        this.engines.push(e);
    }
}

Metazoa.Result = class {
    href;
    icon = null;
    title;
    engines = {};
    extras = {};

    constructor(href, title, icon) {
        const qsan = Metazoa.quickSanitize;
        
        const url = Metazoa.validateUrl(href);
        this.href = url.href;
       
        this.icon = !icon?.length ? Metazoa.getIcon(url.hostname) : qsan(icon);
        this.title = qsan(title.trim());
    }

    addEngine(e, i) {
        if (typeof e === "object") { i = e[1]; e = e[0]; }
        if (typeof e !== "string") throw new Error("Metazoa.Result.addEngine: Invalid input: engine must be of type string or object; received "+typeof e+".");
        if (typeof i !== "number") throw new Error("Metazoa.Result.addEngine:Invalid input: index must be of type number; received "+typeof i+".");
        if (!/^[a-z0-9-]+$/i.test(e)) {
            throw new Error("Metazoa.Result.addEngine: Invalid input: engine must contain only alphanumeric characters and hyphens.");
        }
        this.engines[e] = i;
    }

    addDescription(d, e) {
        d = Metazoa.quickSanitize(d);
        if (!this.description) {
            this.description = d;
            this.descriptor = e;
        }
        if (!this.extras.descriptions) {
            this.extras.descriptions = [new Metazoa.Description(d, e)];
            return;
        }
        let exists = false;
        this.extras.descriptions.forEach(r => {
            const   regex = /[^a-z0-9]/ig,
                    m1 = r.text.replaceAll(regex,''),
                    m2 = d.replaceAll(regex,'');
            if (m1.startsWith(m2)) {
                r.addEngine(e);
                exists = true;
            }
            if (m2.startsWith(m1)) {
                r.text = d;
                r.addEngine(e);
                exists = true;
            }
        });
        if (!exists) this.extras.descriptions.push(new Metazoa.Description(d, e))
    }

    build() {
        console.error("Metazoa.Result.build: Build should be implemented by subclass.");
    }
}

Metazoa.TextResult = class extends Metazoa.Result {

    constructor(href, title, icon) {
        super(href,title,icon);
        const qsan = Metazoa.quickSanitize;
    }

    build() {
        let classes = "text-result";
        let engineHtm = "";
        for (const [engine, index] of Object.entries(this.engines)) {
            const ico = Metazoa.getIcon(engine);
            classes += ` ${engine}-result`;
            engineHtm += `
                <span class="engine-indicator" title="Placed ${index} on ${engine}">
                    <img src="${ico}" width="16px" height="16px" alt="Favicon" />
                </span>`;
        }
        const articleHtm = `
            <article class="${classes}">
                <a href="${this.href}" class="result-link">
                    <cite class="result-uri" title="${this.href}">${this.href}</cite>
                    <img class="result-favicon" src="${this.icon}" width="16px" height="16px" alt="Favicon" />
                    <h3 class="result-title">${this.title}</h3>
                </a>
                <p class="result-description">${this.description}</p>
                <footer>
                    ${engineHtm}
                </footer>
            </article>
        `;
        return articleHtm;
    }
}

Metazoa.ImageResult = class extends Metazoa.Result {
    constructor(href,title,src,icon) {
        super(href,title,icon);
        const qsan = Metazoa.quickSanitize;
        this.src = qsan(src);
    }
}

Metazoa.EngineParser = class {
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
        
        const cacheFile = `${Metazoa.CACHE_LOCATION}/${this.engineName}-${queries.images?'images':'articles'}-${q}`;


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

Metazoa.GoogleParser = class extends Metazoa.EngineParser {
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

                const tr = new Metazoa.TextResult(href, ttl);
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

                const tr = new Metazoa.TextResult(href, ttl);
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
            const ir = new Metazoa.ImageResult(href, ttl, src);
            ir.addEngine(this.engineName, ++i);
            r.push(ir);
        });
        return r;
    }
};

Metazoa.DdgParser = class extends Metazoa.EngineParser {
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

            const tr = new Metazoa.TextResult(href, ttl);
            tr.addDescription(dsc, this.engineName);
            tr.addEngine("ddg", ++i);
            r.push(tr);
        });

        return r.reverse(); // Reverse order to match PHP implementation.
    }
};

Metazoa.BingParser = class extends Metazoa.EngineParser {
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

                const tr = new Metazoa.TextResult(href, ttl);
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

            const ir = new Metazoa.ImageResult(href, ttl, src);
            ir.addEngine(this.engineName, ++i);
            r.push(ir);
        });
        return r;
    }
};

Metazoa.BraveParser = class extends Metazoa.EngineParser {
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

function splitAndLimitLines(str, maxCharsPerLine = 64, maxLines = 3) {
    const regex = new RegExp(`(.{1,${maxCharsPerLine}})(\\s|$)`, 'g');
    const lines = [];
    let match;

    while ((match = regex.exec(str)) !== null && lines.length < maxLines) {
        lines.push(match[1].trim());
    }

    // If the string is longer than the allowed lines, add ellipsis to indicate truncation
    if (regex.lastIndex < str.length) {
        lines[lines.length - 1] += "...";
    }

    return lines.join("\n");
}

(async () => {
    const argv = process.argv;

    const queries = { q: "test" };

    if (argv.length > 2) {
        for (let i = 2; i < argv.length; i++) {
            switch (argv[i]) {
                case "--refresh":
                    queries.refresh = 1;
                    break;
                case "--recache":
                    queries.recache = 1;
                    break;
                default:
                    queries.q =  argv[i];
                    break;
            }
        }
    }

    //const s = Metazoa.combineSuggestions([
    //    await new Metazoa.GoogleParser().getSuggestions(queries.q),
    //    await new Metazoa.DdgParser().getSuggestions(queries.q),
    //    await new Metazoa.BraveParser().getSuggestions(queries.q)
    //]);
    //console.log("\n");
    //s.forEach(r => {
    //    const enginesText = `(${r[1].join(", ")})`;
    //    const pad = 70 - (r[0].length + enginesText.length);
    //    console.log(`  ${r[0]} ${' '.repeat(pad)} ${enginesText}`);
    //});
    //console.log("\n");


    //const i = [
    //    //(await new Metazoa.GoogleParser().getImages(queries)).parse(),
    //    (await new Metazoa.BingParser().getImages(queries)).parse()
    //];
    //console.log(i);

    //return;

    const r = Metazoa.combineResults([
        (await new Metazoa.GoogleParser().getText(queries)).parse(),
        (await new Metazoa.BingParser().getText(queries)).parse(),
        (await new Metazoa.DdgParser().getText(queries)).parse(),
    ]);

    r.forEach(tr => {
        console.log(tr.extras.descriptions);
    });

    //const mpad = (r.length-1).toString().length;
    //const margin = 3;
    //for (let i = r.length-1; i >= 0; i--) {
    //    const tr = r[i];
    //    const pad = i.toString().length;
    //    const space = ' '.repeat(margin+mpad);
    //    console.log(`${i+1}.${' '.repeat(margin-pad)} \u001b[32m${tr.title}\u001b[0m`);
    //    console.log(`${space}\u001b[0;34m${tr.href}\u001b[0m`); 
    //    console.log(`${space}${splitAndLimitLines(tr.description).replace(/\n/g, "\n"+space)}`);
    //    const engie = Object.entries(tr.engines).map(e => `[${e[0].charAt(0).toUpperCase()}${e[1]}]`).join(' - ');
    //    console.log(`${space}\u001b[1;37m${engie}\u001b[0m`);
    //    console.log("\n");
    //}
})();

