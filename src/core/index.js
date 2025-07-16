import * as filters from "./filters/filters.js";
import interfaces from "./interfaces/interfaces.js";
import * as utils from "./utils/utils.js";


// probably none of this makes ansy sense, I'll fix it when I have time but I'm on the crunch grind.

class Metazoa {
    static interfaces = interfaces;
    static mapper = utils.mindexer;

    static createTextArticle() {
        return new interfaces.TextArticle(...arguments) ;
    }
    static createImageArticle() {
        return new interfaces.ImageArticle(...arguments) ;
    }
}

export default Metazoa;
