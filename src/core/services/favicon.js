
function findFavicon(domain) { 
    const defaultFavicon = "";
    if (!domain || typeof domain !== "string") {
        console.warn("Metazoa.getIcon: Invalid domain. Must be of type string.", domain);
        return defaultFavicon;
    }
    if(/[^a-z0-9-_.]/i.test(domain)) {
        console.warn("Metazoa.getIcon: Domain must only include alphanumeric, dots, and hyphens.", domain);
        return defaultFavicon;
    }
    if (!/\./.test(domain)) { 
        // For engine icons
        domain = {
            google: "google.com",
            ddg:    "duckduckgo.com",
            bing:   "bing.com",
            brave:  "brave.com"
        }[domain];
        if (!domain) {
            console.warn("Metazoa.getIcon: Unknown shortcut or domain.", domain);
            return defaultFavicon;
        }
    }
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

export default findFavicon;
