# AaronFrom215 Gaming News

A responsive, English-only gaming-news site powered by publisher RSS feeds, with platform filters, search, and gaming-only trending stories.

The server aggregates publisher-provided RSS metadata, links every card to the original article, and caches results for 30 minutes. It applies English validation, platform matching, blocked-topic filtering, and relevance scoring that favors major franchises and established gaming outlets.

## Run locally

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Run `npm start` and open `http://localhost:3000`.

Run `npm test` to verify the content filters.

## Deploy to Render

Push this folder to GitHub and create a Render Web Service from the repository. No news API key or paid news API subscription is required. Render can use the included `render.yaml`, or you can set the build command to `npm install` and the start command to `npm start`.

RSS feeds remain subject to each publisher's terms. This app displays limited headline metadata with attribution and links readers to the original publisher; it does not reproduce full articles.
