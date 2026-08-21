require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const PUBLIC_DIR = path.join(__dirname, "public");

const gamingQueries = {
  All: '(gaming OR "video games" OR PlayStation OR Xbox OR Nintendo OR Steam OR "PC gaming")',
  PlayStation: '(PlayStation OR PS5 OR "PlayStation 5")',
  Xbox: '(Xbox OR "Xbox Series X" OR "Xbox Series S" OR "Game Pass")',
  Nintendo: '(Nintendo OR "Nintendo Switch")',
  PC: '("PC gaming" OR Steam OR "Epic Games" OR NVIDIA OR AMD)',
  Sports: '("sports video game" OR "NBA 2K" OR Madden OR "College Football" OR "EA Sports FC")'
};

app.disable("x-powered-by");
app.use(express.static(PUBLIC_DIR, { maxAge: "1h", etag: true }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/news", async (req, res) => {
  if (!NEWS_API_KEY) {
    return res.status(503).json({ error: "The server is missing its NEWS_API_KEY environment variable." });
  }

  const category = Object.hasOwn(gamingQueries, req.query.category)
    ? req.query.category
    : "All";

  const params = new URLSearchParams({
    q: gamingQueries[category],
    language: "en",
    sortBy: "publishedAt",
    pageSize: "40"
  });

  try {
    const response = await fetch(`https://newsapi.org/v2/everything?${params}`, {
      headers: { "X-Api-Key": NEWS_API_KEY },
      signal: AbortSignal.timeout(10000)
    });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || "NewsAPI request failed." });
    }

    const articles = (data.articles || [])
      .filter((article) => article.title && article.url && article.title !== "[Removed]")
      .map((article) => ({
        title: article.title,
        description: article.description || "Open the full story for more details.",
        image: article.urlToImage || null,
        url: article.url,
        source: article.source?.name || "Gaming News",
        publishedAt: article.publishedAt,
        category
      }));

    res.set("Cache-Control", "public, max-age=300");
    return res.json({ category, count: articles.length, articles });
  } catch (error) {
    console.error("News request failed:", error.message);
    return res.status(502).json({ error: "Gaming news is temporarily unavailable. Please try again." });
  }
});

app.get("/", (_req, res) => {
  res.redirect("/index.html");
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AaronFrom215 Gaming News is running on port ${PORT}`);
});
