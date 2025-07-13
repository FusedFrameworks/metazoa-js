//const fs = require("fs");
//const cheerio = require("cheerio");
const filters = require("./filter/filter.js");
const interfaces = require("./interfaces/interfaces.js");
const mapper = require("./mapper/mapper.js");
const security = require("./security/security.js");
const services = require("./services/services.js");
require('dotenv').config();

class Metazoa {
    static CACHE_LOCATION = process.env.CACHE_LOCATION || "./cache";

    static interfaces = interfaces;
    static parsers = {
        GoogleParser: require("./parser/google.js"),
        BraveParser:  require("./parser/brave.js"),
        DuckParser:   require("./parser/duck.js"),
        BingParser:   require("./parser/bing.js")
    };
    static mapper = mapper;
    
    static createTextArticle() {
        return new interfaces.TextArticle(...arguments) ;
    }

    static createImageArticle() {
        return new interfaces.ImageArticle(...arguments) ;
    }
}

class QueryParams {
    constructor(params) {
        /* 
         * Parameters to be passed to search engines. Mostly using 
         * Google's format for now; Standardize however seems sensible.
         * Some engines may not have a given parameter in which case 
         * it will be ignored for said engines.
         * null means don't bother passing this parameter
        */
        // This is documented as if algorithms exist that don't yet
        // Should have external documentation this is getting to bee too much for inline
        
        // On DDG langauge and location are set by 'kl' which is formatted (e.g.) 'us-en'
        this.hl  =  params.hl    || "en";                  // host lang; 'setlang' on Bing
        this.lr  =  params.lr    || null;                  // lang restrict
        this.gl  =  params.gl    || "us";                  // geolocation. 'loc' param on Bing takes a ZIP code
        this.num =  params.num   || null;                  // number of results
        this.ofs =  params.ofs   || null;                  /* offset (this should be used later in individual queries)
                                                               Param is 'start' on Google. Param is 'first' on Bing */
        this.safe = params.safe  || "min";                 /* safe search, should turn off (or restricted to images) by default once custom filters are up?
                                                               Param is 'safe' on Google with values: 'active', 'off', 'images'
                                                               Param is 'adlt' on Bing with values: 'strict', 'moderate', 'off' 
                                                               Param is 'safesearch' on DDG with values: '1' (strict), '2' (moderate), '-1' (off)
                                                               We will accept values 'off', 'min', 'med', 'max' scope will be determined in the next param */
        this.safetyscope = params.safetyscope || 'all';    // Accepts values: 'all', 'web', 'img' for now
        this.type        = params.type        || null;     /* Result type, possibly type(s) in the future?
                                                               Param is 'tbm' on Google with values: 'isch' (images), 
                                                               'vid' (videos), 'nws' (news), 'shop' (shopping), 'fin' (finance)
                                                               Param is 'scope' on Bing with values: web, images, videos, news */
        // "andvanced" params
        this.daterange = params.daterange   || null;       /* Date ranges will only support d, w, m, y for now
                                                                    Param is `as_qdr` with values: 'd', 'w', 'm', 'y' and ranges
                                                                    Param is 'df' (date filter) on Bing with values: 'today', 'week', 'month', 'year'
                                                                    Param is 'df', on DDG with values: 'd', 'w', 'm', 'y' */
        this.sitesearch= params.sitesearch  || null;       // Param is 'as_sitesearch' on Google
        this.filetype  = params.filetype    || null;       // Param is 'as_filetype' on Google

        /*
         * Other parameters (to be planned) include, but not limited to:
         * - input / output encoding
         * - button click emulation on Google (I'm not really sure the use case)
         * - 'filters' param on Bing, should be really useful. There also should be a Google equivelant
         * - DDG 'noamp'(Accelerated Mobile Pages) maybe?
        */
    }
}

class Weights {

}

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

module.exports = Metazoa;
