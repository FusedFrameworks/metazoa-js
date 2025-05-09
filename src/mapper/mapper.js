function combineArticles(resArr) {
    const combMap = new Map();
    resArr.forEach(r => {
        r.forEach(tr => {
            const { href, engines } = tr;
            if (!combMap.has(href)) {
                combMap.set(href, tr);
            }
            const cr = combMap.get(href);
            cr.addDescription(tr.description, tr.descriptor);
            Object.entries(engines).forEach((e, i) => {
                cr.addEngine(e, i);
            }); 
        });
    });

    const combArr = Array.from(combMap.values());
    combArr.sort((a,b) => {
        const aPlacement = Object.values(a.engines);
        const avgA = aPlacement.reduce((sum, val) => sum + val, 0) / aPlacement.length;
        const bPlacement = Object.values(b.engines);
        const avgB = bPlacement.reduce((sum, val) => sum + val, 0) / bPlacement.length;
        return avgA - avgB;
    });
    return combArr;
}

function combineSuggestions(sugArr) {
    const combMap = new Map();
    sugArr.forEach(s => {
        s.forEach(r => {
            const [q, engines] = r;
            if (!combMap.has(q)) {
                combMap.set(q, r);
            }
            const cr = combMap.get(q);
            engines.forEach(e => {
                if (cr[1].indexOf(e) >= 0) {
                    return;
                }
                cr[1].push(e);
            });
        });
    });
    const combArr = Array.from(combMap.values());
    combArr.sort((a,b) => {
        return (a[0].length - b[0].length) + (b[1].length - a[1].length);
    });
    return combArr;
}

module.exports = {
    combineArticles,
    combineSuggestions
}
