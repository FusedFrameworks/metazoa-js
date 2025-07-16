import * as cheerio from "cheerio";
import ifc from "../../core/interfaces/interfaces.js";
import EngineParser from "./generic.js";

const BraveParser = class extends EngineParser {
    engineName = "brave";
    shortName = "BV"
    suggestUri = "https://search.brave.com/api/suggest?q=%s&rich=true&source=web";
    static features = [
        "suggest"
    ];

    constructor() {
        super();
        this.features = BraveParser.features;
    }

    async getText(q) {
        const params = new URLSearchParams({ q });
        const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
          method: 'get',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'x-subscription-token': process.env.BRAVE_API_KEY,
          },
        });
        return {
            parse: async () => this.parseResults(await response.json())
        };
    }

    parseResults(results) {
        // I'm discarding rivers of information here
        // This could be so much better. My data structures just aren't good enough
        return results.web.results.map((result,index) => {
            let article = new ifc.TextArticle(result.url, result.title);
            article.addDescription(result.description, this.engineName);
            article.addEngine("brave", index);
            return article;
        });
    }

    getSuggestions(q) {
        //console.log(`Metazoa.BraveParser.getSuggestions: Fetching suggestions from ${this.engineName} for: "${q}"`);
        return fetch(this.suggestUri.replace("%s", q)).then(d => d.json())
        .then(d => {
            const s = [];
            if (!d?.[1]) return [];
            for (const i in d[1]) {
                if (d[1][i].q === q) {
                    //console.log(`Metazoa.BraveParser.getSuggestions: Suggestion ${i} from ${this.engineName} same as input "${q}". Omitting`);
                    continue;
                }
                s.push({
                    q: d[1][i].q,
                    e: [ { name: this.engineName, short: this.shortName, place: i } ],
                    ext: {
                        // TODO: Brave has extra content in suggestions, like descriptions/images
                    }
                });
            }
            return s;
        });
    }
}

export default BraveParser;
