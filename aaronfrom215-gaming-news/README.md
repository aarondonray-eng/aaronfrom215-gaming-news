# AaronFrom215 Gaming News

A responsive, English-only gaming-news site powered by NewsAPI, with platform filters, search, and gaming-only trending stories.

The server uses English-only requests, gaming-specific queries, category validation, blocked-topic filtering, and relevance scoring that favors major franchises and established gaming outlets.

## Run locally

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Put your NewsAPI key in `.env`.
5. Run `npm start` and open `http://localhost:3000`.

Run `npm test` to verify the content filters.

Never commit `.env`; it is intentionally excluded by `.gitignore`.

## Deploy to Render

Push this folder to GitHub, create a Render Web Service from the repository, and add `NEWS_API_KEY` as a secret environment variable. Render can use the included `render.yaml`, or you can set the build command to `npm install` and the start command to `npm start`.

NewsAPI licensing and plan restrictions may apply to production deployments. Check your NewsAPI plan before publishing.
