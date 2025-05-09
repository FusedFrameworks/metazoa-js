# Metazoa (Javascript)

This is the JS library for Metazoa. When used with Node/Bun it can scrape and parse results from popular engines, as well as form a mini-index of sorts (a cache really).
This is a metasearch library, a "bang" engine (like DDG's !google). Another feature is filtering, both server and client side. In the future we should be making a larger piece of software to properly index results with extra information, but for now this is essential bare-minimum to be considered even a metaengine. This library will allow youd to create a metasearch engine or site search very easily, that's it's only goal for now as it is being made to run KestronProgramming/Slueth. There will be a PHP variant of the library as well as other languages. And for the larger servers that do full indexing we have yet to choose tech, they will not be in JS though as this library already shows how slow initial indexing can be in JS.

## Features

- [x] Basic result scraping
- [x] (Bing only, WIP) Basic image results
- [x] Basic search suggestions
- [ ] DB indexing (cache)
- [ ] Bangs
    - [ ] Legacy DuckDuckGo Bangs
    - [ ] Extended Bangs
    - [ ] Bang overrides
- [ ] Filters
    - [ ] Malware filter
    - [ ] NSFW filter
    - [ ] Unhelpful filter


