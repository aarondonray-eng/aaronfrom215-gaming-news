// Curated official gameplay videos. Keep publisher attribution beside each player.
const gameplayTrailers = [
  {id:"C5qWGaqzk98",title:"Fable",detail:"Gameplay teaser",publisher:"Xbox",source:"https://news.xbox.com/en-us/2026/01/22/xbox-developer-direct-2026-recap/"},
  {id:"XG1Ll2CVhug",title:"Forza Horizon 6",detail:"Gameplay teaser trailer",publisher:"Xbox",source:"https://news.xbox.com/en-us/2026/01/22/xbox-developer-direct-2026-recap/"},
  {id:"87TNASkXOWQ",title:"Final Fantasy VII Revelation",detail:"Gameplay trailer",publisher:"Square Enix",source:"https://na.finalfantasy.com/news/2839"}
];
const trailerGrid = document.querySelector("#trailerGrid");
trailerGrid.innerHTML = gameplayTrailers.map(trailer => `
  <article class="card trailer-card">
    <div class="trailer-screen" data-trailer-screen="${trailer.id}">
      <button class="trailer-play" type="button" data-trailer="${trailer.id}" aria-label="Play ${trailer.title} gameplay trailer">
        <img src="https://i.ytimg.com/vi/${trailer.id}/hqdefault.jpg" alt="" loading="lazy">
        <span class="trailer-play-icon" aria-hidden="true">▶</span>
        <span class="trailer-play-label">Watch gameplay</span>
      </button>
    </div>
    <div class="card-body"><span class="card-category">${trailer.detail}</span><h3>${trailer.title}</h3>
      <p class="card-description">Official video from ${trailer.publisher}.</p>
      <div class="card-meta"><a class="card-link" href="${trailer.source}" target="_blank" rel="noopener noreferrer">Publisher source</a><a class="card-link" href="https://www.youtube.com/watch?v=${trailer.id}" target="_blank" rel="noopener noreferrer">Watch on YouTube</a></div>
    </div>
  </article>`).join("");
trailerGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-trailer]");
  if (!button) return;
  const trailer = gameplayTrailers.find(item => item.id === button.dataset.trailer);
  if (!trailer) return;
  // Stop an earlier video when another trailer is opened.
  trailerGrid.querySelectorAll("iframe").forEach(frame => {
    const original = gameplayTrailers.find(item => item.id === frame.dataset.trailerId);
    const screen = frame.parentElement;
    screen.innerHTML = `<button class="trailer-play" type="button" data-trailer="${original.id}" aria-label="Play ${original.title} gameplay trailer"><img src="https://i.ytimg.com/vi/${original.id}/hqdefault.jpg" alt="" loading="lazy"><span class="trailer-play-icon" aria-hidden="true">▶</span><span class="trailer-play-label">Watch gameplay</span></button>`;
  });
  const frame = document.createElement("iframe");
  frame.src = `https://www.youtube-nocookie.com/embed/${trailer.id}?playsinline=1&rel=0`;
  frame.title = `${trailer.title} — official gameplay trailer`;
  frame.dataset.trailerId = trailer.id;
  frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  frame.allowFullscreen = true;
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  button.replaceWith(frame);
  frame.focus();
});
