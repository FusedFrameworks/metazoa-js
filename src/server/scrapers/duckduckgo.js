import * as cheerio from "cheerio";
import ifc from "../../core/interfaces/interfaces.js";
import EngineParser from "./generic.js";

const DuckParser = class extends EngineParser {
    engineName = "duckduckgo";
    shortName = "DG"
    searchUri = "https://lite.duckduckgo.com/lite/?q=%s";
    imageSearchUri = "https://duckduckgo.com/?q=%s&iax=images&ia=images";
    suggestUri = "https://duckduckgo.com/ac/?q=%s&type=list";
    static features = [
        "text",
        "suggest"
    ];

    constructor() {
        super();
        this.features = DuckParser.features;
    }

    parseText(htm) {
        const $ = cheerio.load(htm);
        const fel = $(".filters");
        if (!fel) {
            console.error("Metazoa.DuckParser: Could not find expected '.filters' element.");
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
            tr.addEngine("duckduckgo", ++i);
            r.push(tr);
        });

        return r.reverse();
    }
};

export default DuckParser;
