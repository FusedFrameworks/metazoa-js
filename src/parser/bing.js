const cheerio = require("cheerio");
const ifc = require("../interfaces/interfaces.js");

BingParser = class extends EngineParser {
    engineName = "bing";
    shortName = "BN";
    searchUri = "https://www.bing.com/search?q=%s";
    imageSearchUri="https://www.bing.com/images/search?q=%s&form=HDRSC3&first=1"
    static features = [
        "text",
        "image",
        "suggest"
    ];
        
    constructor() {
        super();
        this.features = BingParser.features;
    }

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

    genCVID() {
        return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, () =>
            Math.floor(Math.random() * 16).toString(16).toUpperCase()
        );
    }

    genSuggestUri(q, cp = q.length-1, cvid = this.cvid) {
        return `https://www.bing.com/AS/Suggestions?pt=page.home&qry=${q}&cp={cp}&csr=1&msbqf=false&pths=2&cvid=${cvid}`;
    }

    getSuggestions(q) {
        console.log(`Metazoa.BingParser.getSuggestions: Fetching suggestions from ${this.engineName} for: "${q}"`);
        // Bing telemetry, unfortunately it's necessary.
        // I do believe CVID stands for "Client Visitor ID"
        // And it should be able to be regenerated at will.
        if (!this.cvid) this.cvid = this.genCVID();
        return fetch(this.genSuggestUri(q)).then(d => d.json())
        .then(dat => {
            const d = dat.s;
            const s = [];
            for (const i in d) {
                // Remove non-ascii characters, for now.
                // We will need to preserve multi-lang support in the future.
                const cq = d[i].q.replace(/[^\x20-\x7E]/g, '');
                if (d[i].q === q) {
                    console.log(`Metazoa.BingParser.getSuggestions: Suggestion ${i} from ${this.engineName} same as input "${q}". Omitting`);
                    continue;
                }
                s.push({
                    q: cq,
                    e: [ { name: this.engineName, short: this.shortName, place: i } ],
                    ext: {
                        // TODO: Bing has extra content in suggestions, like descriptions/imagees
                    }
                });
            }
            return s;
        });
    }
};

module.exports = BingParser;
