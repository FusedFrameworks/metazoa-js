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
    const comb = new Map();
    sugArr.forEach(s => {
        s.forEach(r => {
            const { q, e, p } = r;
            if (!comb.has(q)) {
                comb.set(q, r);
            }

            const cr = comb.get(q);
            e.forEach(en => {
                if (cr.e.includes(en)) return;
                cr.e.push(en);
            });
        });
    });
    const sort = Array.from(comb.values());
    sort.forEach(s => {
        const places = s.e.map(e => +e.place);
        
        // Remove a single outlier if it skews the average significantly
        let filteredPlaces = [...places];
        if (places.length >= 4) {
            const mean = places.reduce((a, b) => a + b, 0) / places.length;
            const stdev = Math.sqrt(places.map(p => Math.pow(p - mean, 2)).reduce((a, b) => a + b, 0) / places.length);
        
            const outliers = places.filter(p => Math.abs(p - mean) > stdev * 1.5);
            if (outliers.length === 1) {
                filteredPlaces = places.filter(p => p !== outliers[0]);
            }
        }
        
        const avgPlace = 1 + filteredPlaces.reduce((o, c) => o + c, 0) / filteredPlaces.length;
        
        const appearanceBias = s.e.length < 2 
            ? -1  // penalize less appearances
            : (s.e.length - 2) * 0.2;  // slight boost beyond 2
        
        const lengthBias = Math.exp(-Math.pow(s.q.length - 15, 2) / (2 * Math.pow(5, 2))) * 0.2;
        
        s.p = parseFloat((avgPlace - appearanceBias - lengthBias).toFixed(2));
    });
    sort.sort((a,b) => a.p - b.p);
    return sort;
}

module.exports = {
    combineArticles,
    combineSuggestions
}
