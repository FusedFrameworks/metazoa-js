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

class SearchHelper {
    constructor(engineNames, weights) {
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
    constructor(engineNames = ["text"], weights) {
        /* Other options might include:
         * - complexity (how much information)
         * - caching
        */
        super(engineNames, weights);
    }

    get(q) {
        return new Promise(async (resolve, reject) => {
            const s = Metazoa.mapper.combineArticles(await Promise.all(this.engines.map(async e => { 
                //console.log(e)
                return (await e.getText(q)).parse()
            })), this.weights);
            resolve(s);
        });
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
