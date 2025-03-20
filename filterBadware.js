
const fs = require('fs');

function getHostname(url) {
    try {
        const parsedUrl = new URL(url);
		// Normalize
        return parsedUrl.hostname.replace('www.', '');
    } catch (e) {
        return '';
    }
}

function filterBadware(url, filePath) {
    let blocklist = fs.readFileSync(filePath, 'utf-8');
    if (typeof blocklist === 'string') {
        blocklist = blocklist.split('\n');
    }

    if (!url.startsWith("http")) {
        url = "https://"+url;
    }

    const hostname = getHostname(url);

    // Check blocklist
    for (const rule of blocklist) {
        if (rule.startsWith('||')) {
            // Domain rule (e.g., ||example.com^)
            const domain = rule.slice(2).split('^')[0];
            if (hostname === domain) {
                return true;
            }
        } else if (rule.startsWith('/')) {
            // Parse regex rule and directives
            const [fullRule, regexPattern, directives] = rule.match(/^\/(.+)\/\$(.*)$/) || [];
            if (!fullRule) continue;

            // Parse directives
            const directiveMap = {};
            if (directives) {
                directives.split(',').forEach(directive => {
                    const [key, value] = directive.split('=');
                    directiveMap[key] = value || true;
                });
            }

            // Handle domain/TLD whitelisting
            if (directiveMap.to) {
                const whitelist = directiveMap.to
                    .split('|')
                    .filter(item => item.startsWith('~'))
                    .map(item => item.slice(1));

                // Check if URL matches any whitelisted domain or TLD
                for (const whitelistItem of whitelist) {
                    // Check if whitelistItem is a TLD (doesn't contain dots)
                    if (!whitelistItem.includes('.')) {
                        if (hostname.endsWith(`.${whitelistItem}`)) {
                            return false;
                        }
                    } 
                    // Check if whitelistItem is a domain
                    else if (hostname === whitelistItem || hostname.endsWith(`.${whitelistItem}`)) {
                        return false;
                    }
                }
            }

            // Test the URL against the regex pattern
            try {
                const regex = new RegExp(regexPattern);
                if (regex.test(url)) {
                    return true;
                }
            } catch (e) {
                console.error('Invalid regex pattern:', regexPattern);
            }
        }
    }
    return false;
}

module.exports = filterBadware;
