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
