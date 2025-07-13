import Metazoa from "../core/index.js";
import * as scrapers from "./scrapers/scrapers.js";

Metazoa.parsers = scrapers;

class SearchHelper {
    constructor(engineNames, weights, queryParams) {
        if (typeof engineNames !== "object") { throw new Error`Metazoa.${this.constructor.name}: Type error: engines is not of type 'object'. Should be an array of exact names`; }
        this.engines = (names => {
            if (names.includes("all")) { return Object.entries(Metazoa.parsers).map(p => new p[1]()); }
            let parsers = [];
            if (names.includes("google"))     parsers.push(new Metazoa.parsers.GoogleParser());
            if (names.includes("brave"))      parsers.push(new Metazoa.parsers.BraveParser());
            if (names.includes("duckduckgo")) parsers.push(new Metazoa.parsers.DuckParser());
            if (names.includes("bing"))       parsers.push(new Metazoa.parsers.BingParser());
            for (const feat of [
                "text",
                "images",
                "suggest"
            ]) {
                if (!names.includes(feat)) continue;
                Object.entries(Metazoa.parsers).forEach(p => {
                    if (p[1].features.includes(feat)) {
                        //console.log(`feature ${feat} found on ${p[0]}`);
                        if (parsers.includes(p[1])) {
                            //console.log(`ignoring ${p[0]} from feat. ${feat}: already in parsers`);
                            return;
                        }
                        parsers.push(new p[1]());
                    }
                });
            }
            return parsers;
        })(engineNames);
        this.weights = weights;
        
    }
};


Metazoa.ImageSearch = class extends SearchHelper {

}

Metazoa.TextSearch = class extends SearchHelper {
    constructor(engineNames = ["text"], weights, queryParams) {
        /* Other options might include:
         * - complexity (how much information)
         * - search parameters like language, safe search, result count etc.
         * - caching
        */
        super(engineNames, weights);
    }

    _pull(q) {
        return new Promise(async (resolve, reject) => {
            const s = Metazoa.mapper.combineArticles(await Promise.all(this.engines.map(async e => { 
                //console.log(e)
                const r = (await e.getText(q))?.parse();
                if (!r) return [];
                return r;
            })), this.weights);
            resolve(s);
        });
    }

    get(q) {
        return this._pull(q);
    }
};

Metazoa.Suggest = class extends SearchHelper {
        constructor(engineNames = ["suggest"], weights, minimal = true) {
            super(engineNames, weights);
            this.minimal = minimal;
        }

       get(q) {
            return new Promise(async (resolve, reject) => {
                const s = Metazoa.mapper.combineSuggestions(await Promise.all(this.engines.map(e => e.getSuggestions(q))), this.weights);
                resolve(s);
            });
        }
    };


export default Metazoa;
