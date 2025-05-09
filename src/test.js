const Metazoa = require("./index.js");

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
            const s = Metazoa.combineSuggestions([
                await new Metazoa.parsers.GoogleParser().getSuggestions(queries.q),
                await new Metazoa.parsers.DdgParser().getSuggestions(queries.q),
                await new Metazoa.parsers.BraveParser().getSuggestions(queries.q)
            ]);
            console.log("\n");
            s.forEach(r => {
                const enginesText = `(${r[1].join(", ")})`;
                const pad = 70 - (r[0].length + enginesText.length);
                console.log(`  ${r[0]} ${' '.repeat(pad)} ${enginesText}`);
            });
            console.log("\n");
            break;
        default:
            const r = Metazoa.combineResults([
                (await new Metazoa.parsers.GoogleParser().getText(queries)).parse(),
                (await new Metazoa.parsers.BingParser().getText(queries)).parse(),
                (await new Metazoa.parsers.DdgParser().getText(queries)).parse(),
            ]);
            const mpad = (r.length-1).toString().length;
            const margin = 3;
            for (let i = r.length-1; i >= 0; i--) {
                const tr = r[i];
                const pad = i.toString().length;
                const space = ' '.repeat(margin+mpad);
                console.log(`${i+1}.${' '.repeat(margin-pad)} \u001b[32m${tr.title}\u001b[0m`);
                console.log(`${space}\u001b[0;34m${tr.href}\u001b[0m`); 
                console.log(`${space}${splitAndLimitLines(tr.description).replace(/\n/g, "\n"+space)}`);
                const engie = Object.entries(tr.engines).map(e => `[${e[0].charAt(0).toUpperCase()}${e[1]}]`).join(' - ');
                console.log(`${space}\u001b[1;37m${engie}\u001b[0m`);
                console.log("\n");
            }
    }

})();
