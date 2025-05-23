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

Metazoa.Search = class {
    constructor() {
    }

    get(q) {
    }
};

Metazoa.Suggest = class {
        constructor(engines = ["all"], minimal = true, weights) {
            this.engines = [];
            if (typeof engines !== "object") { throw new Error`Metazoa.Suggest: Type error: engines is not of type 'object'. Should be an array of exact names`; }
            if (engines.includes("all")) {
                this.engines = [
                    new Metazoa.parsers.GoogleParser(),
                    new Metazoa.parsers.BraveParser(),
                    new Metazoa.parsers.DuckParser(),
                    new Metazoa.parsers.BingParser()
                ];
            } else {
                if (engines.includes("google"))     this.engines.push(new Metazoa.parsers.GoogleParser());
                if (engines.includes("brave"))      this.engines.push(new Metazoa.parsers.BraveParser());
                if (engines.includes("duckduckgo")) this.engines.push(new Metazoa.parsers.DuckParser());
                if (engines.includes("bing"))       this.engines.push(new Metazoa.parsers.BingParser());
            }
            this.minimal = minimal;
            this.weights = weights;
        }

       get(q) {
            return new Promise(async (resolve, reject) => {
                const s = Metazoa.mapper.combineSuggestions(await Promise.all(this.engines.map(e => e.getSuggestions(q))), this.weights);
                resolve(s);
            });
        }
    };

module.exports = Metazoa;
