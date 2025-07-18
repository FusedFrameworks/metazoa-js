import Metazoa from "../src/server/index.js";

function splitAndLimitLines(str, maxCharsPerLine = 64, maxLines = 3) {
    const regex = new RegExp(`(.{1,${maxCharsPerLine}})(\\s|$)`, 'g');
    const lines = [];
    let match;

    while ((match = regex.exec(str)) !== null && lines.length < maxLines) {
        lines.push(match[1].trim());
    }

    // If the string is longer than the allowed lines, add ellipsis to indicate truncation
    if (regex.lastIndex < str.length) {
        lines[lines.length - 1] += "...";
    }

    return lines.join("\n");
}


(async () => {
    const argv = process.argv;

    const queries = { q: "test" };

    if (argv.length > 2) {
        for (let i = 2; i < argv.length; i++) {
            switch (argv[i]) {
                case "--suggest":
                    queries.test = "suggest";
                    break;
                case "--images":
                    queries.test = "images";
                    break;
                case "--refresh":
                    queries.refresh = 1;
                    break;
                case "--recache":
                    queries.recache = 1;
                    break;
                default:
                    queries.q =  argv[i];
                    break;
            }

        }
    }

    switch(queries.test) {
        case "images":
            const i = [
                //(await new Metazoa.parsers.GoogleParser().getImages(queries)).parse(),
                (await new Metazoa.parsers.BingParser().getImages(queries)).parse()
            ];
            console.log(i);
            break;
        case "suggest":
            const s = await new Metazoa.Suggest().get(queries.q);
            console.log("\n");
            const leftBoxWidth = 70;
            console.log(` Query:${" ".repeat(leftBoxWidth-20)}Engines:${" ".repeat(15)}Placment:`)
            s.forEach(r => {
                //const engie = Object.entries(r[1]).map(e => `[${e[0].charAt(0).toUpperCase()}${e[1]}]`).join(' - ');
                //const enginesText = `(${r[1].join(", ")})`;
                const enginesText = r.e.map(en => `${en.short}-${en.place}`).join(", ");
                const pad = leftBoxWidth - (r.q.length + enginesText.length);
                console.log(`  ${r.q} ${' '.repeat(pad)} ${enginesText}       ${r.p}${" ".repeat(11-r.p.toString().length)}`);
            });
            console.log("\n");
            break;
        default:
            const r = await new Metazoa.TextSearch(["bing","duckduckgo","brave"]).get(queries.q);
            const mpad = (r.length-1).toString().length;
            const margin = 3;
            for (let i = r.length-1; i >= 0; i--) {
                const tr = r[i];
                const pad = i.toString().length;
                const space = ' '.repeat(margin+mpad);
                console.log(`${i+1}.${' '.repeat(margin-pad)} \u001b[32m${tr.title}\u001b[0m`);
                console.log(`${space}\u001b[0;34m${tr.href}\u001b[0m`); 
                console.log(`${space}${
                        splitAndLimitLines(tr.description)
                        .replace(/\n/g, "\n"+space)
                }`);
                const engie = Object.entries(tr.engines).map(e => `[${e[0].charAt(0).toUpperCase()}${e[0].charAt(1).toUpperCase()}${e[1]}]`).join(' - ');
                console.log(`${space}\u001b[1;37m${engie}\u001b[0m`);
                console.log("\n");
            }
    }

})();
