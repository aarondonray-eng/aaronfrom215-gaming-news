require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const RSS_SOURCES = [
  { name: "PlayStation Blog", url: "https://blog.playstation.com/feed/", category: "PlayStation" },
  { name: "Xbox Wire", url: "https://news.xbox.com/en-us/feed/", category: "Xbox" },
  { name: "Nintendo Life", url: "https://www.nintendolife.com/feeds/latest", category: "Nintendo" },
  { name: "Push Square", url: "https://www.pushsquare.com/feeds/latest", category: "PlayStation" },
  { name: "Pure Xbox", url: "https://www.purexbox.com/feeds/latest", category: "Xbox" },
  { name: "PC Gamer", url: "https://www.pcgamer.com/rss/", category: "PC" },
  { name: "Gematsu", url: "https://www.gematsu.com/feed/", category: "All" },
  { name: "Operation Sports", url: "https://www.operationsports.com/feed/", category: "Sports" }
];
const CACHE_MS = 30 * 60 * 1000;
const feedCache = { articles: [], fetchedAt: 0, refreshPromise: null };

const gamingQueries = {
  All: '("video game" OR gaming OR PlayStation OR PS5 OR Xbox OR Nintendo OR Switch OR Steam OR "PC gaming" OR "game developer" OR "game studio") AND (announce OR release OR launch OR trailer OR gameplay OR update OR patch OR DLC OR expansion OR delay OR showcase OR review)',
  PlayStation: '(PlayStation OR PS5 OR "PlayStation Studios") AND (game OR gaming OR release OR trailer OR update OR DLC OR studio OR showcase)',
  Xbox: '(Xbox OR "Xbox Series X" OR "Xbox Series S" OR "Game Pass" OR "Xbox Game Studios") AND (game OR gaming OR release OR trailer OR update OR DLC OR showcase)',
  Nintendo: '(Nintendo OR Switch OR "Nintendo Direct") AND (game OR gaming OR release OR trailer OR update OR DLC OR showcase)',
  PC: '("PC game" OR "PC gaming" OR Steam OR "Epic Games Store" OR GOG) AND (release OR trailer OR update OR patch OR DLC OR studio OR showcase)',
  Sports: '("sports video game" OR "NBA 2K" OR Madden OR "College Football" OR "EA Sports FC" OR "MLB The Show" OR NHL) AND (game OR gameplay OR release OR trailer OR update OR patch OR DLC)'
};
const categoryTerms = {
  All: [],
  PlayStation: ["playstation", "ps5", "ps4", "sony interactive", "playstation studios"],
  Xbox: ["xbox", "game pass", "series x", "series s", "microsoft gaming", "xbox game studios"],
  Nintendo: ["nintendo", "switch", "mario", "zelda", "pokemon"],
  PC: ["pc game", "pc gaming", "steam", "epic games store", "gog", "windows game"],
  Sports: ["nba 2k", "madden", "college football", "ea sports fc", "fifa", "mlb the show", "nhl", "sports game", "sports video game"]
};
const gamingCoreTerms = ["video game", "videogame", "gaming", "gameplay", "gamer", "playstation", "ps5", "xbox", "game pass", "nintendo", "switch 2", "nintendo switch", "steam", "pc game", "esports", "dlc", "expansion pack", "game developer", "game studio", "game publisher", "patch notes", "early access", "console game"];
const newsTerms = ["announce", "reveal", "release", "launch", "trailer", "update", "patch", "dlc", "expansion", "delay", "showcase", "direct", "state of play", "developer", "studio", "publisher", "gameplay", "review", "remaster", "remake", "beta", "season", "roadmap", "demo", "early access", "acquisition", "layoff"];
const majorFranchises = ["grand theft auto", "gta 6", "call of duty", "nba 2k", "madden", "college football", "ea sports fc", "god of war", "ghost of yotei", "ghost of tsushima", "zelda", "mario", "pokemon", "fortnite", "minecraft", "elden ring", "resident evil", "final fantasy", "assassin's creed", "battlefield", "halo", "forza"];
const blockedTerms = ["cryptocurrency", "crypto market", "bitcoin", "ethereum", "blockchain", "prediction market", "polymarket", "stock price", "stock market", "wall street", "investor", "investment", "finance", "cftc", "interest rate", "university", "college admission", "scholarship", "curriculum", "online degree", "education policy", "amazon deal", "best deal", "coupon", "promo code", "black friday", "prime day", "shopping guide", "gaming chair", "gaming-chair", "gaming desk", "gaming mouse", "gaming keyboard", "headset deal", "monitor deal", "laptop deal", "sports betting", "betting odds", "casino", "lottery", "gift guide"];
const reputableSources = ["ign", "gamespot", "game informer", "polygon", "eurogamer", "vgc", "gamesradar", "pc gamer", "rock paper shotgun", "nintendo life", "push square", "pure xbox", "xbox wire", "playstation blog", "nintendo", "steam", "the verge", "ars technica", "associated press", "reuters", "bloomberg", "game developer", "gematsu", "destructoid"];

const normalize = (value = "") => String(value).toLowerCase().replace(/\s+/g, " ").trim();
const includesAny = (text, terms) => terms.some((term) => text.includes(term));

function isEnglishText(text) {
  if (/[\u0400-\u052f\u0600-\u06ff\u0900-\u097f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(text)) return false;
  const words = ` ${normalize(text)} `;
  return ![" el juego ", " los juegos ", " fecha de ", " mise à jour ", " jeux vidéo ", " der spiel ", " das spiel ", " jogos de "].some((marker) => words.includes(marker));
}

function scoreArticle(article, category = "All") {
  const title = normalize(article.title);
  const body = normalize(`${article.title || ""} ${article.description || ""} ${article.content || ""}`);
  const source = normalize(article.source?.name);
  let score = includesAny(title, gamingCoreTerms) ? 5 : includesAny(body, gamingCoreTerms) ? 3 : 0;
  score += includesAny(title, newsTerms) ? 3 : includesAny(body, newsTerms) ? 1 : 0;
  if (includesAny(body, majorFranchises)) score += 3;
  if (includesAny(source, reputableSources)) score += 4;
  if (category !== "All" && includesAny(body, categoryTerms[category])) score += 4;
  if (article.urlToImage) score += 1;
  return score;
}

function isGamingArticle(article, category = "All") {
  if (!article?.title || !article?.url || article.title === "[Removed]") return false;
  const body = normalize(`${article.title} ${article.description || ""} ${article.content || ""}`);
  if (!isEnglishText(body) || includesAny(body, blockedTerms)) return false;
  if (category !== "All" && !includesAny(body, categoryTerms[category])) return false;
  return scoreArticle(article, category) >= (category === "All" ? 5 : 7);
}

function rankArticles(articles, category) {
  return articles.filter((article) => isGamingArticle(article, category)).map((article) => ({ article, score: scoreArticle(article, category) })).sort((a, b) => b.score - a.score || new Date(b.article.publishedAt || 0) - new Date(a.article.publishedAt || 0)).map(({ article }) => article);
}

function decodeEntities(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'");
}

function stripHtml(value = "") {
  return decodeEntities(value).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tagValue(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return decodeEntities(match[1]).trim();
  }
  return "";
}

function attributeValue(block, tags, attribute) {
  for (const tag of tags) {
    const match = block.match(new RegExp(`<${tag}\\b[^>]*\\b${attribute}=["']([^"']+)["'][^>]*>`, "i"));
    if (match) return decodeEntities(match[1]);
  }
  return "";
}

function parseFeed(xml, source) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) || [];
  return blocks.map((block) => {
    const rawDescription = tagValue(block, ["description", "summary", "content:encoded", "content"]);
    const title = stripHtml(tagValue(block, ["title"]));
    const url = tagValue(block, ["link"]) || attributeValue(block, ["link"], "href");
    const image = attributeValue(block, ["media:content", "media:thumbnail", "enclosure"], "url") || (rawDescription.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || "");
    return {
      title,
      description: stripHtml(rawDescription).slice(0, 320),
      image: image || null,
      url,
      source: { name: source.name },
      publishedAt: tagValue(block, ["pubDate", "published", "updated", "dc:date"]) || new Date().toISOString(),
      feedCategory: source.category
    };
  }).filter((article) => article.title && /^https?:\/\//i.test(article.url));
}

async function fetchFeed(source) {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "AaronFrom215GamingNews/1.0 (+https://aaronfrom215-gaming-news.onrender.com)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`${source.name} returned ${response.status}`);
  return parseFeed(await response.text(), source);
}

async function refreshFeeds() {
  if (feedCache.refreshPromise) return feedCache.refreshPromise;
  feedCache.refreshPromise = Promise.allSettled(RSS_SOURCES.map(fetchFeed)).then((results) => {
    const fresh = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    results.forEach((result, index) => {
      if (result.status === "rejected") console.warn(`RSS feed unavailable: ${RSS_SOURCES[index].name}: ${result.reason.message}`);
    });
    if (fresh.length) {
      const seen = new Set();
      feedCache.articles = fresh.filter((article) => {
        const key = normalize(article.url || article.title);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      feedCache.fetchedAt = Date.now();
    }
    return feedCache.articles;
  }).finally(() => { feedCache.refreshPromise = null; });
  return feedCache.refreshPromise;
}

async function getFeedArticles() {
  if (feedCache.articles.length && Date.now() - feedCache.fetchedAt < CACHE_MS) return feedCache.articles;
  return refreshFeeds();
}

app.disable("x-powered-by");
app.use(express.static(PUBLIC_DIR, { maxAge: "1h", etag: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/news", async (req, res) => {
  const category = Object.hasOwn(categoryTerms, req.query.category) ? req.query.category : "All";
  try {
    const feedArticles = await getFeedArticles();
    const categoryPool = category === "All"
      ? feedArticles
      : feedArticles.filter((article) => article.feedCategory === category || article.feedCategory === "All");
    const articles = rankArticles(categoryPool, category).slice(0, 40).map((article) => ({
      title: article.title,
      description: article.description || "Open the original story for more details.",
      image: article.image || null,
      url: article.url,
      source: article.source?.name || "Gaming News",
      publishedAt: article.publishedAt,
      category
    }));
    res.set("Cache-Control", "public, max-age=600, stale-while-revalidate=1800");
    return res.json({ category, count: articles.length, articles });
  } catch (error) {
    console.error("RSS request failed:", error.message);
    return res.status(502).json({ error: "Gaming news feeds are temporarily unavailable. Please try again." });
  }
});

app.get("/", (_req, res) => res.redirect("/index.html"));
app.get("*", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
if (require.main === module) app.listen(PORT, "0.0.0.0", () => console.log(`AaronFrom215 Gaming News is running on port ${PORT}`));

module.exports = { app, isEnglishText, isGamingArticle, parseFeed, rankArticles, scoreArticle };
