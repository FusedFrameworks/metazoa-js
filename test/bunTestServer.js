import { serve } from "bun";
import fs from "fs";
import path from "path";
import Metazoa from "../src/index.js";

const textSearcher = new Metazoa.TextSearch();
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
function renderSearchHtml(articlesData, initialQuery = "") {
    // Escape any potentially problematic characters in the initialQuery
    const safeInitialQuery = initialQuery.replace(/"/g, '&quot;');

    // Convert articlesData to a JSON string to embed it directly into the HTML
    const articlesJson = JSON.stringify(articlesData);

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Search Results</title>
            <style>
               :root {
    /* Muted Pastel Light Mode */
    --bg-color-light: #edf3f9; /* Softer, muted light blue background */
    --text-color-light: #4a5e75; /* Muted blue-grey for general text */
    --border-color-light: #d0d9e2; /* Softer, paler blue-grey border */
    --card-bg-light: #ffffff; /* White for cards, for contrast */
    --search-bg-light: #e7eff6; /* Muted light blue pastel for search input */
    --search-border-light: #c3ced9; /* Softer, muted blue-grey for search border */
    --highlight-color-light: #7fa9d4; /* Muted periwinkle blue for selection/focus */
    --accent-text-light: #5a7fa8; /* Muted, calming blue for links/highlights */
    --engine-tag-bg-light: #d9eef3; /* Muted cool pastel for engine tags */
    --engine-tag-text-light: #5f7f88; /* Muted blue-green for engine tag text */

    /* Muted Purple Dark Mode */
    --bg-color-dark: #201a28; /* Deep, muted plum/eggplant background */
    --text-color-dark: #c9c2d3; /* Softer, muted lavender-grey for general text */
    --border-color-dark: #3a3244; /* Paler muted plum border for less vividness */
    --card-bg-dark: #292230; /* Slightly muted deep plum for cards */
    --search-bg-dark: #332b3f; /* Muted medium plum for search input */
    --search-border-dark: #4a4258; /* Softer, muted plum for search border */
    --highlight-color-dark: #8f7bbd; /* Muted pastel purple for selection/focus */
    --accent-text-dark: #a895c8; /* Softer, muted pastel purple for links/highlights */
    --engine-tag-bg-dark: #443a50; /* Muted desaturated purple for engine tags */
    --engine-tag-text-dark: #d3c8e0; /* Pale, muted lavender for engine tag text */
}


body {
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 20px;
    display: flex;
    flex-direction: column;
    /* Removed align-items: center; to allow left alignment */
    background-color: var(--bg-color-light);
    color: var(--text-color-light);
    transition: background-color 0.3s ease, color 0.3s ease;
}

body.dark-mode {
    background-color: var(--bg-color-dark);
    color: var(--text-color-dark);
}

/* Fixed max-width for content - now applies to a wrapper around all main content */
.content-wrapper {
    max-width: 800px; /* Adjust as needed */
    width: 100%;
    /* Added margin: 0 auto; to center the wrapper itself */
    margin: 0 auto;
}

h1 {
    color: inherit;
    margin-top: 0;
    margin-bottom: 20px;
    font-weight: normal;
}

/* Search Bar Styling */
.search-container {
    width: 100%;
    margin-bottom: 30px;
    /* Removed justify-content: center; to allow left alignment */
    display: flex; /* Keep flex to ensure input takes full width */
}

.search-input {
    width: 100%;
    padding: 12px 20px;
    border: 1px solid var(--search-border-light);
    border-radius: 25px;
    background-color: var(--search-bg-light);
    color: var(--text-color-light);
    font-size: 1.1em;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    box-sizing: border-box;
    transition: border-color 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease;
}

body.dark-mode .search-input {
    border-color: var(--search-border-dark);
    background-color: var(--search-bg-dark);
    color: var(--text-color-dark);
}

.search-input:focus {
    outline: none;
    border-color: var(--highlight-color-light); /* Use highlight color */
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2); /* Keep a subtle shadow */
}

body.dark-mode .search-input:focus {
    border-color: var(--highlight-color-dark); /* Dark mode highlight */
    box-shadow: 0 2px 8px rgba(169, 217, 245, 0.2); /* Dark mode subtle shadow */
}


/* Dark Mode Toggle */
.dark-mode-toggle {
    position: absolute;
    top: 20px;
    right: 20px;
    padding: 10px 15px;
    border: none;
    border-radius: 20px;
    background-color: var(--card-bg-light);
    color: var(--text-color-light);
    cursor: pointer;
    font-size: 0.9em;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    transition: background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
}

body.dark-mode .dark-mode-toggle {
    background-color: var(--card-bg-dark);
    color: var(--text-color-dark);
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}

.dark-mode-toggle:hover {
    opacity: 0.9;
}

/* Article Styling */
.article {
    background-color: var(--card-bg-light);
    border: 2px solid var(--border-color-light);
    border-radius: 15px;
    padding: 15px 20px;
    margin-bottom: 15px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.08);
    transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.2s ease, transform 0.2s ease;
    position: relative;
    overflow: hidden;
}

body.dark-mode .article {
    background-color: var(--card-bg-dark);
    border-color: var(--border-color-dark);
    box-shadow: 0 2px 5px rgba(0,0,0,0.25);
}

.article:last-child {
    margin-bottom: 0;
}

.article.selected {
    border-color: var(--highlight-color-light); /* Use highlight color for light mode selection */
    box-shadow: 0 4px 10px rgba(0, 123, 255, 0.3);
    transform: translateY(-2px);
}

body.dark-mode .article.selected {
    border-color: var(--highlight-color-dark); /* Use highlight color for dark mode selection */
    box-shadow: 0 4px 10px rgba(169, 217, 245, 0.3); /* Dark mode specific shadow for selection */
}

.article h3 {
    margin-top: 0;
    margin-bottom: 8px;
    font-weight: 500;
}

.article h3 a {
    color: var(--accent-text-light); /* Use accent color for links */
    text-decoration: none;
    transition: color 0.2s ease;
}

body.dark-mode .article h3 a {
    color: var(--accent-text-dark); /* Dark mode accent color */
}

.article h3 a:hover {
    color: var(--highlight-color-light); /* Subtle highlight on hover */
}

body.dark-mode .article h3 a:hover {
    color: var(--highlight-color-dark); /* Dark mode subtle highlight on hover */
}

.article p {
    margin-bottom: 10px;
    line-height: 1.5;
    color: inherit; /* Ensure paragraph text inherits body text color */
}

.article ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 0.9em;
    color: var(--engine-tag-text-light); /* Default engine tag text color */
}
body.dark-mode .article ul {
     color: var(--engine-tag-text-dark); /* Dark mode engine tag text color */
}

.article ul li {
    background-color: var(--engine-tag-bg-light); /* Light background for engine tags */
    padding: 5px 10px;
    border-radius: 10px;
    font-weight: 500;
    transition: background-color 0.3s ease;
}
body.dark-mode .article ul li {
    background-color: var(--engine-tag-bg-dark); /* Dark mode background for engine tags */
}

/* No articles message */
.no-articles-message {
    text-align: center;
    padding: 50px;
    color: var(--text-color-light);
    font-size: 1.2em;
    border: 1px dashed var(--border-color-light);
    border-radius: 15px;
    background-color: var(--card-bg-light);
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

body.dark-mode .no-articles-message {
    color: var(--text-color-dark);
    border-color: var(--border-color-dark);
    background-color: var(--card-bg-dark);
}
            </style>
        </head>
        <body>
            <button id="darkModeToggle" class="dark-mode-toggle">Toggle Dark Mode</button>

            <div class="content-wrapper">
                <h1>Search Results</h1>

                <div class="search-container">
                    <input type="text" id="searchBar" class="search-input" placeholder="Search..." value="${safeInitialQuery}" />
                </div>

                <div id="articles-container">
                    <!-- Articles will be rendered here by JavaScript -->
                </div>
            </div>

            <script>
document.title = new URLSearchParams(document.location.search).get("");

                let currentSelectedIndex = -1;
                let articles = [];

                // --- Dark Mode Logic ---
                const darkModeToggle = document.getElementById('darkModeToggle');
                const body = document.body;

                function enableDarkMode() {
                    body.classList.add('dark-mode');
                    localStorage.setItem('theme', 'dark');
                    darkModeToggle.textContent = 'Toggle Light Mode';
                }

                function disableDarkMode() {
                    body.classList.remove('dark-mode');
                    localStorage.setItem('theme', 'light');
                    darkModeToggle.textContent = 'Toggle Dark Mode';
                }

                const savedTheme = localStorage.getItem('theme');
                if (savedTheme === 'dark') {
                    enableDarkMode();
                } else {
                    disableDarkMode();
                }

                darkModeToggle.addEventListener('click', () => {
                    if (body.classList.contains('dark-mode')) {
                        disableDarkMode();
                    } else {
                        enableDarkMode();
                    }
                });

                // --- Article Rendering Function ---
                function renderTextArticles(articlesData) {
                    const container = document.getElementById('articles-container');
                    container.innerHTML = '';
                    currentSelectedIndex = -1;

                    if (!articlesData || articlesData.length === 0) {
                        container.innerHTML = '<div class="no-articles-message">No articles found for your query.</div>';
                        return;
                    }

                    articlesData.forEach((article, index) => {
                        const articleDiv = document.createElement('div');
                        articleDiv.classList.add('article');
                        articleDiv.dataset.index = index;

                        let enginesHtml = '<ul>';
                        Object.entries(article.engines).forEach(engine => {
                            enginesHtml += \`<li>\${engine[0]}: \${engine[1]}</li>\`;
                        });
                        enginesHtml += '</ul>';

                        articleDiv.innerHTML = \`
                            <h3><a href="\${article.href}" target="_blank">\${article.title}</a></h3>
                            <p>\${article.description}</p>
                            <p><strong>Engines:</strong> \${enginesHtml}</p>
                        \`;
                        container.appendChild(articleDiv);
                    });

                    articles = Array.from(document.querySelectorAll('.article'));
                    if (articles.length > 0) {
                        selectArticle(0);
                    }
                }

                // --- Arrow Key Navigation Logic ---
                function selectArticle(index) {
                    if (articles.length === 0) return;

                    if (currentSelectedIndex !== -1 && articles[currentSelectedIndex]) {
                        articles[currentSelectedIndex].classList.remove('selected');
                    }

                    if (index < 0) {
                        currentSelectedIndex = 0;
                    } else if (index >= articles.length) {
                        currentSelectedIndex = articles.length - 1;
                    } else {
                        currentSelectedIndex = index;
                    }

                    if (articles[currentSelectedIndex]) {
                        articles[currentSelectedIndex].classList.add('selected');
                        articles[currentSelectedIndex].scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest'
                        });
                    }
                }

                document.addEventListener('keydown', (event) => {
                    if (articles.length === 0 || document.activeElement === document.getElementById('searchBar')) {
                        return;
                    }

                    if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        selectArticle(currentSelectedIndex + 1);
                    } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        selectArticle(currentSelectedIndex - 1);
                    } else if (event.key === 'Enter') {
                        event.preventDefault();
                        if (currentSelectedIndex !== -1 && articles[currentSelectedIndex]) {
                            const link = articles[currentSelectedIndex].querySelector('h3 a');
                            if (link) {
                                window.open(link.href, '_blank');
                            }
                        }
                    }
                });

document.addEventListener("keydown", (event) => {
    const searchBar = document.getElementById("searchBar");

    // Ctrl (or Cmd on macOS) + K to focus the search bar
    if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault(); // Prevent default browser behavior
        if (searchBar) {
            searchBar.focus(); // Focus the search bar
            searchBar.select(); // Optionally select the text inside the search bar
        }
    }

    // Escape key to unfocus the search bar
    if (event.key === "Escape") {
        if (document.activeElement === searchBar) {
            searchBar.blur(); // Remove focus from the search bar
            event.preventDefault(); // Prevent any default behavior
        }
    }
});

                // --- Search Bar Event Listener ---
                const searchBar = document.getElementById('searchBar');
                searchBar.addEventListener('keypress', async (event) => {

                    if (event.key === 'Enter') {
                        const query = searchBar.value.trim();
                        if (query) {
                            // Fetch data from your Bun backend
                            const response = await fetch(\`/search?q=\${encodeURIComponent(query)}\`);
                            if (response.ok) {
                                // Since Bun returns the whole HTML, we'd navigate.
                                // But if this were an API endpoint, we'd parse JSON:
                                // const newArticles = await response.json();
                                // renderTextArticles(newArticles);
                                // For a full page reload from Bun, we just let the browser navigate.
                                // For an SPA-like experience with frontend search, you'd fetch JSON.
                                window.location.href = \`/search?q=\${encodeURIComponent(query)}\`; // Redirect to new search URL
                            } else {
                                console.error('Error fetching search results:', response.statusText);
                                renderTextArticles([]); // Show no results on error
                            }
                        } else {
                            // If search bar is cleared and Enter is pressed, show no results
                            renderTextArticles([]);
                            window.history.pushState({}, '', '/search'); // Update URL to reflect empty query
                        }
                    }
                });

                // Initialize search bar with current query from URL, if any
                const urlParams = new URLSearchParams(window.location.search);
                const initialQueryFromUrl = urlParams.get('q') || '';
                if (initialQueryFromUrl) {
                    searchBar.value = initialQueryFromUrl;
                }

                // Initial render of articles from the data provided by the Bun backend
                // This __INITIAL_ARTICLES_DATA__ will be injected by Bun.
                const initialArticlesData = ${articlesJson};
                renderTextArticles(initialArticlesData);
            </script>

        </body>
        </html>
    `;
}

async function search(url) {
    const q = url.searchParams.get("q");
    if (q.match(/\(on engines:.+$/)) return redirect("http://localhost:3000/search",q.replace(/\(on engines:.+$/,"").trim());
    if (!q) return new Response("Bad Request. No query.", { status: 400 });

    if (q.match(/\!\w/)) return redirect("unduck.link", q);
    // return redirect("duck.com", q);

    const articles = await textSearcher.get(q);

    const htmlResponse = renderSearchHtml(articles, q);

    return new Response(htmlResponse, {
        headers: { "content-type": "text/html" },
        status: 200,
    });

}
async function opensearchXML() {
    const filePath = "test/opensearch.xml"
    const fileContent = await fs.promises.readFile(filePath, "utf-8");
    return new Response(fileContent, { headers: { "Content-Type": "application/opensearchdescription+xml" } });
}
async function opensearchHTML() {
    const filePath = "test/opensearch.html";
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

