

import { serve } from "bun";
import fs from "fs";
import path from "path";
import Metazoa from "../src/index.js";

const suggester = new Metazoa.Suggest();

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
function redirect(site, q) {
    return new Response(`<!doctype html><script>location.replace("https://${site}?q=${q}")</script>`, { headers: { "content-type": "text/html" } });
}
function search(url) {
    const q = url.searchParams.get("q");
    if (q.match(/\!\w/)) return redirect("unduck.link", q);
    return redirect("duck.com", q);
}
async function opensearchXML() {
    const filePath = "./opensearch.xml"
    const fileContent = await fs.promises.readFile(filePath, "utf-8");
    return new Response(fileContent, { headers: { "Content-Type": "application/opensearchdescription+xml" } });
}
async function opensearchHTML() {
    const filePath = "./opensearch.html";
    const fileContent = await fs.promises.readFile(filePath, "utf-8");
    return new Response(fileContent, { headers: { "Content-Type": "text/html" } });
}

// Create the server
serve({
    port: 3000,
    fetch: async (req) => {
        // Create a URL object from the request
        const url = new URL(req.url);

        switch (url.pathname) {
            case "/suggest":
            return suggestions(url);

            case "/search":
            return search(url);

            case "/opensearch.xml":
            return opensearchXML();

            default:
            return opensearchHTML();
        }
    },
});

console.log("Server is running on http://localhost:3000");

