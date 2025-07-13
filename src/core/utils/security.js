function quickSanitize(inp) {
    if (typeof inp !== "string") {
        console.warn("Metazoa.quickSanitize: Input was not a string. Coercing to string.");
        inp = String(inp);
    }
    return inp.replace(/[&<>"']/g, (char) => {
        const echars = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return echars[char];
    });
}

function validateUrl(href) {
    try {
        const nhref = href.trim().replace(/^http(s|):\/\//, "https://");
        return new URL(nhref.startsWith("https://") ? nhref : "https://"+nhref);
    } catch (e) {
        console.error("Metazoa.validateURL: Invalid URL:", href);
        throw new Error("Metazoa.validateURL: Invalid URL provided.");
    }
}

export {
    quickSanitize,
    validateUrl
};
