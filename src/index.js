//const fs = require("fs");
//const cheerio = require("cheerio");
const filters = require("./filter/filter.js");
const interfaces = require("./interfaces/interfaces.js");
const mapper = require("./mapper/mapper.js");
const engineParsers = require("./parser/parser.js");
const security = require("./security/security.js");
const services = require("./services/services.js");
require('dotenv').config();

class Metazoa {
    static CACHE_LOCATION = process.env.CACHE_LOCATION || "./cache";

    static interfaces = interfaces;
    static parsers = engineParsers;
    static mapper = mapper;
    
    static createTextArticle() {
        return new interfaces.TextArticle(...arguments) ;
    }

    static createImageArticle() {
        return new interfaces.ImageArticle(...arguments) ;
    }
}


module.exports = Metazoa;
