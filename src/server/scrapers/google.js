import * as cheerio from "cheerio";
import ifc from "../../core/interfaces/interfaces.js";
import EngineParser from "./generic.js";

const GoogleParser = class extends EngineParser {
    engineName = "google";
    shortName = "GG";
    searchUri = "https://www.google.com/search?q=%s";
    imageSearchUri = "https://www.google.com/search?tbm=isch&q=%s";
    suggestUri = "http://suggestqueries.google.com/complete/search?output=firefox&q=%s";
    static features = [
        "text",
        "image",
        "suggest"
    ];

    constructor() {
        super();
        this.features = GoogleParser.features;
    }

    parseText(htm) {
        const $ = cheerio.load(htm);

        // BREAKS CACHING AND USERAGENT
        /*(async () => {
        const queries = {};
        const fa = $("a");
        if (fa.text().match(/click here/i)) {
            console.log("Redirect found on Google, unfortunately");
            queries.recache = queries.recache ?? 1;
            queries.q = fa.prop("href").replace("/search?q=", "");
            htm = (await this.getText(queries)).html;
            //console.log(queries)
            //console.log(htm)
        }
        })();*/

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
                const dsc = $(el).text().trim();

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

export default GoogleParser;
