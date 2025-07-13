import { serve } from "bun";
import Metazoa from "../src/index.js";

const textSearcher = new Metazoa.TextSearch();
const suggester = new Metazoa.Suggest();

function htmlEnc(s) {
    return s.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&#34;');
}

async function suggestions(url) {
    const q = url.searchParams.get("q");
    if (!q) return new Response("Not Found", { status: 404 });
    
    const res = await suggester.get(q)
    .then(s => {
        return [ q, s.map(r => {
            const enginesText = r.e.map(en => `${en.short}`).join(", ");
            //return `  ${r.q} ${' '.repeat(70 - (r.q.length + enginesText.length))} ${enginesText}  ${r.p}${" ".repeat(6 - r.p.toString().length)}${r.scores}`;
            return `${r.q} (on engines: ${enginesText})`;
        })];
    });

    return new Response(JSON.stringify(res), { status: 200, headers: { "content-type": "application/json" } });
}

function templatePage(body, title = "Metazoa WebTUI. After all, why not.", css = "") {
    // I know this is dumb. Shut up
    return `<!DOCTYPE html>
    <html>
    <head>
    <style>
        @layer base, utils, components;
    
        @import "https://cdn.jsdelivr.net/npm/@webtui/css@0.1.3/dist/full.css";

        @layer base {
            body {
                min-height: 100vh;
                padding: 2ch 1lh;
            }
        }

        @layer components {
            /*h1::before { content: "# "; }
            h2::before { content: "## "; }
            h3::before { content: "### "; }
            h4::before { content: "#### "; }
            h5::before { content: "##### "; }
            h6::before { content: "###### "; }*/
            [is-="input"]:focus {
                outline: 2px solid var(--foreground1);
            }
            [is-="button"]:focus {
                --background1: var(--background2);
            }
            a {
                color: cornflowerblue;
            }
            a:visited {
                color: lightblue;
            }
            a:focus {
                outline: 2px solid cornflowerblue;
                outline-offset: 0.65ch;
            }
        }
    </style>
    <style>${css}</style>
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.6/dist/htmx.min.js" integrity="sha384-Akqfrbj/HpNVo8k11SXBb6TlBWmXXlYQrCSqEWmyKJe+hDm3Z/B2WVG4smwBkRVm" crossorigin="anonymous"></script>
    </head>
    <body data-webtui-theme="dark">${body}</body>
    </html`;
}


function redirect(site, q) {
    const targetUrl = site.startsWith("http")
        ? `${site}?q=${encodeURIComponent(q)}`
        : `https://${site.replace(/\/+$/, "")}?q=${encodeURIComponent(q)}`;

    return new Response(null, {
        status: 302,
        headers: {
            "Location": targetUrl,
        },
    });
}

function genSearchFormHTML(query="", placeholder="&#x1F50E;&#xFE0E; Find me") {
    return `
    <form action="/search" style="padding:0">
        <input name="q" type="search" is-="input" style="width:32ch;padding: 1lh 2ch" placeholder="${placeholder}" value="${query}" />
        <input type="submit" is-="button" variant-="background1" value="Go" />
    </form>`;
}



function homepage() {
    const homeHTML = `
    <h1>Metagrep</h1>
    <hr style="margin-block-end: 1lh">
    <p>This is a prototype, a proof of concept. It's not gonna be good. <span is-="badge" variant-="background3">Deal with it :P</span>.</p>
    ${genSearchFormHTML()}
    `;
    return new Response(templatePage(homeHTML), {
        status: 200,
        headers: {
            'content-type': "text/html"
        }
    });
}


async function search(url) {
    const q = url.searchParams.get("q");
    if (q.match(/\(on engines:.+$/)) return redirect("http://localhost:3001/search",q.replace(/\(on engines:.+$/,"").trim());
    if (!q) {
        return new Response(templatePage("<h1>400 Bad Request</h1><p>No query provided</p>"), 
            { status: 400, headers: { "content-type": "text/html" } });
    }

    if (q.match(/\!\w/)) return redirect("unduck.link", q);

    const articles = await textSearcher.get(q);

    let articlesHTML = "";

    const searchTerms = q.split(/\s/);

    articles.forEach(article => {
        console.log(article)
        let enginesHTML = '<ul>';
        Object.entries(article.engines).forEach(engine => {
            enginesHTML += `<li is-="badge" variant-="background3">${engine[0]}: ${engine[1]}</li> `;
        });
        enginesHTML += '</ul>';
    
        // I tried HTML encoding. I'll probably just load on the front-end anyway
        // Server performance for rendering ALL articles would be absolute popoo
        // Plus, it doesn't SEEM to be rendering any HTML in the descriptions...
        // Hopefully... It threorhettically could thouggh...
        const titleText = article.title;
        const hrefText = article.href;
        let descriptionHTML = article.description;

        // THIS SHOULD BE CLIENT SIDE!! I'm only prototyping here. All code should be rewritten
        console.log(searchTerms)
        searchTerms.forEach(term => { 
            const regexp = new RegExp(term, "ig");
            console.log(regexp)
            descriptionHTML = descriptionHTML.replaceAll(regexp, `<strong>${term}</strong>`); 
            console.log(descriptionHTML)
        });

        articlesHTML += `
        <article class="ar">
            <header class="article-header" box-="sqaure">
                <a href="${article.href}" style="text-decoration: none" class="article-hyperlink">
                    <div>
                        <div style="display:grid;grid-template-columns:auto 1fr;gap:1ch;margin:0;">
                            <div class="article-favicon-wrapper">
                                <img src="${article.icon}" class="article-favicon" />
                            </div>
                            <div style="overflow:hidden">
                                <h3 class="ellipsis" style="color: var(--foreground0);margin:0;padding:0" title="${titleText}">${titleText}</h3>
                                <div class="ellipsis" style="text-decoration: underline" title="${article.href}">${hrefText}</div>
                            </div>
                        </div>
                    </div>
                </a>
            </header>
            <br>
            <p>${descriptionHTML}</p>
            <p style="color: var(--foreground2)">Description provided by <span is-="badge" variant-="background2">${article.descriptor}</span></p>
            <br>
            <footer>
                ${enginesHTML}
            </footer>
        </article>
        `;
    })

    const searchHTML = `
    <h1>Search</h1>
    <hr style="margin-block-end: 1lh">
    ${genSearchFormHTML(htmlEnc(q))}
    <main id="main">
        <div class="header">
            <h2 style="padding:0;margin-block: 1ch 0;background-color: var(--background0);display:inline">Results</h2>
        </div>
        ${articlesHTML}
    </main>
    `;

    const theCSS = `
        #main {
            --box-border-color: var(--background2);
            --box-rounded-radius: 8px;
            --box-border-width: 1px;
            --box-double-border-width: 1px;
            max-width: 77ch;
        }
        .ellipsis {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .wrap-all {
            overflow-wrap: break-word;
            word-wrap: break-word;
            -ms-word-break: break-all;
            word-break: break-all;
            word-break: break-word; /* non-standard but works in WebKit */
            -ms-hyphens: auto;
            -moz-hyphens: auto;
            -webkit-hyphens: auto;
            hyphens: auto;
        }
        .ar {
            margin-block-start: 1lh;
            background-color: var(--background1);
            padding: 1lh 2ch;
        }
        .article-favicon-wrapper {
            width: 3ch; 
            height: 2lh;
            display: grid;
            align-items: center;
            position: relative;
            isolation: isolate;
        }
        .article-favicon-wrapper:before {
            content: '';
            z-index: -1;
            position: absolute;
            left:0;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            aspect-ratio: 1/1;
            background-color: #fff;
            border-radius: 100%;
        }
        .article-favicon {
            max-width: 100%; max-height: 100%; width: 100%; aspect-ratio: 1/1;
        }
    `;
    return new Response(templatePage(searchHTML, `${q} - Metazoa WebTUI`, theCSS), {
        status: 200,
        headers: {
            'content-type': "text/html"
        }
    });
}


serve({
    port: 3001,
    fetch: async (req) => {
        // Create a URL object from the request
        const url = new URL(req.url);

        switch (url.pathname) {
            case "/search":
                return search(url);
            case "/search":
                return search(url);
            default:
                return homepage();
        }
    },
});

console.log("Server is running on http://localhost:3001");
