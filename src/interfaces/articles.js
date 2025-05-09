const security = require("../security/security.js");
const { findFavicon } = require("../services/services.js");

class Description {
    text = "";
    engines = [];

    constructor(d, e) {
        this.text = d;
        this.engines = [e];
    }

    addEngine(e) {
        if (typeof e !== "string") throw new Error("Metazoa.Description.addEngine: Invalid input: engine must be of type string or object; received "+typeof e+".");
        for (let en of this.engines) { if (en === e) return; }
        this.engines.push(e);
    }
}

class Article {
    href;
    icon = null;
    title;
    engines = {};
    extras = {};

    constructor(href, title, icon) {
        const qsan = security.quickSanitize;
        
        const url = security.validateUrl(href);
        this.href = url.href;
       
        this.icon = !icon?.length ? findFavicon(url.hostname) : qsan(icon);
        this.title = qsan(title.trim());
    }

    addEngine(e, i) {
        if (typeof e === "object") { i = e[1]; e = e[0]; }
        if (typeof e !== "string") throw new Error("Metazoa.Result.addEngine: Invalid input: engine must be of type string or object; received "+typeof e+".");
        if (typeof i !== "number") throw new Error("Metazoa.Result.addEngine:Invalid input: index must be of type number; received "+typeof i+".");
        if (!/^[a-z0-9-]+$/i.test(e)) {
            throw new Error("Metazoa.Result.addEngine: Invalid input: engine must contain only alphanumeric characters and hyphens.");
        }
        this.engines[e] = i;
    }

    addDescription(d, e) {
        d = security.quickSanitize(d);
        if (!this.description) {
            this.description = d;
            this.descriptor = e;
        }
        if (!this.extras.descriptions) {
            this.extras.descriptions = [new Description(d, e)];
            return;
        }
        let exists = false;
        this.extras.descriptions.forEach(r => {
            const   regex = /[^a-z0-9]/ig,
                    m1 = r.text.replaceAll(regex,''),
                    m2 = d.replaceAll(regex,'');
            if (m1.startsWith(m2)) {
                r.addEngine(e);
                exists = true;
            }
            if (m2.startsWith(m1)) {
                r.text = d;
                r.addEngine(e);
                exists = true;
            }
        });
        if (!exists) this.extras.descriptions.push(new Description(d, e))
    }

    build() {
        console.error("Metazoa.Result.build: Build should be implemented by subclass.");
    }
}

class TextArticle extends Article {

    constructor(href, title, icon) {
        super(href,title,icon);
        const qsan = security.quickSanitize;
    }

    build() {
        let classes = "text-result";
        let engineHtm = "";
        for (const [engine, index] of Object.entries(this.engines)) {
            const ico = sevices.getIcon(engine);
            classes += ` ${engine}-result`;
            engineHtm += `
                <span class="engine-indicator" title="Placed ${index} on ${engine}">
                    <img src="${ico}" width="16px" height="16px" alt="Favicon" />
                </span>`;
        }
        const articleHtm = `
            <article class="${classes}">
                <a href="${this.href}" class="result-link">
                    <cite class="result-uri" title="${this.href}">${this.href}</cite>
                    <img class="result-favicon" src="${this.icon}" width="16px" height="16px" alt="Favicon" />
                    <h3 class="result-title">${this.title}</h3>
                </a>
                <p class="result-description">${this.description}</p>
                <footer>
                    ${engineHtm}
                </footer>
            </article>
        `;
        return articleHtm;
    }
}

class ImageArticle extends Article {
    constructor(href,title,src,icon) {
        super(href,title,icon);
        const qsan = security.quickSanitize;
        this.src = qsan(src);
    }
}

module.exports = {
    Article,
    TextArticle,
    ImageArticle
}
