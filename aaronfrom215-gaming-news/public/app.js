const categories=[
  {key:"PlayStation",id:"playstation",label:"PlayStation",tagline:"For the players",number:"02",theme:"light"},
  {key:"Xbox",id:"xbox",label:"Xbox",tagline:"Power your dreams",number:"03",theme:"panel"},
  {key:"Nintendo",id:"nintendo",label:"Nintendo",tagline:"Play your way",number:"04",theme:"light"},
  {key:"PC",id:"pc",label:"PC Gaming",tagline:"The cutting edge",number:"05",theme:"panel"},
  {key:"Sports",id:"sports",label:"2K / Sports",tagline:"Built for competition",number:"06",theme:"light"}
];
const fallbackImage="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80";
const store={All:[],...Object.fromEntries(categories.map(({key})=>[key,[]]))};
const escapeHTML=(value="")=>String(value).replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
const clean=(value="")=>String(value).replace(/\s+/g," ").trim();

function formatDate(value){const date=new Date(value);if(Number.isNaN(date.getTime()))return"Recently";const seconds=Math.max(0,Math.floor((Date.now()-date.getTime())/1000));if(seconds<3600)return`${Math.max(1,Math.floor(seconds/60))} min ago`;if(seconds<86400)return`${Math.floor(seconds/3600)} hr ago`;if(seconds<604800)return`${Math.floor(seconds/86400)}d ago`;return date.toLocaleDateString(undefined,{month:"short",day:"numeric"})}
function card(article,{rank=null,featured=false}={}){return`<article class="card${featured?" featured-card":""}"><div class="card-media"><img src="${escapeHTML(article.image||fallbackImage)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImage}'">${rank?`<span class="card-rank">${String(rank).padStart(2,"0")}</span>`:""}</div><div class="card-body"><span class="card-category">${escapeHTML(article.category||"Gaming")}</span><h3>${escapeHTML(clean(article.title))}</h3><p class="card-description">${escapeHTML(clean(article.description||"Open the story for the full details."))}</p><div class="card-meta"><span>${escapeHTML(article.source||"Gaming News")} · ${formatDate(article.publishedAt)}</span><a class="card-link" href="${escapeHTML(article.url)}" target="_blank" rel="noopener noreferrer" aria-label="Read ${escapeHTML(article.title)}">Read</a></div></div></article>`}
function state(title,message){return`<div class="state"><strong>${escapeHTML(title)}</strong>${escapeHTML(message)}</div>`}
function skeletons(count=3){return Array.from({length:count},()=>'<div class="skeleton" aria-hidden="true"></div>').join("")}
function buildSections(){document.querySelector("#categorySections").innerHTML=categories.map(({id,label,tagline,number,theme,key})=>`<section class="news-section section-${theme}" id="${id}"><div class="section-heading"><div><span class="section-number">${number}</span><p>${tagline}</p><h2>${label}</h2></div><span class="result-count">Latest stories</span></div><div class="category-grid" data-grid="${key}">${skeletons(4)}</div></section>`).join("")}
async function fetchCategory(category){const response=await fetch(`/api/news?category=${encodeURIComponent(category)}`);const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load stories.");return data.articles||[]}
function setHero(article){if(!article)return;document.querySelector("#heroCategory").textContent=article.category||"Top Story";document.querySelector("#breakingTitle").textContent=clean(article.title);document.querySelector("#heroSummary").textContent=clean(article.description||"Open the full story for more details.");document.querySelector("#heroMeta").textContent=`${article.source||"Gaming News"}  ·  ${formatDate(article.publishedAt)}`;const link=document.querySelector("#heroLink");link.href=article.url;link.classList.remove("disabled");document.querySelector("#heroBackdrop").style.backgroundImage=`url("${String(article.image||fallbackImage).replace(/["\\]/g,"\\$&")}")`}
function renderAll(term=""){const query=term.trim().toLowerCase();const filter=items=>query?items.filter(item=>[item.title,item.description,item.source].some(value=>String(value||"").toLowerCase().includes(query))):items;const trending=filter(store.All).slice(0,5);document.querySelector("#trendingGrid").innerHTML=trending.length?trending.map((item,index)=>card(item,{rank:index+1,featured:index===0})).join(""):state("No stories found",query?"Try another search.":"Check back in a moment.");document.querySelector("#resultCount").textContent=`${filter(store.All).length} stories loaded`;categories.forEach(({key})=>{const items=filter(store[key]).slice(0,4);document.querySelector(`[data-grid="${key}"]`).innerHTML=items.length?items.map(item=>card(item)).join(""):state("No stories found",query?"Try another search.":"Fresh headlines are on the way.")})}
async function loadNews(){buildSections();document.querySelector("#trendingGrid").innerHTML=skeletons(3);const keys=["All",...categories.map(({key})=>key)];const results=await Promise.allSettled(keys.map(fetchCategory));results.forEach((result,index)=>{if(result.status==="fulfilled")store[keys[index]]=result.value});const first=store.All[0]||categories.map(({key})=>store[key][0]).find(Boolean);setHero(first);renderAll();if(results.every(result=>result.status==="rejected"))document.querySelector("#resultCount").textContent="News temporarily unavailable"}
function toast(message){const el=document.querySelector("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2600)}
let installPrompt=null;
const installDialog=document.querySelector("#installDialog");
const installMessage=document.querySelector("#installMessage");
const dialogInstall=document.querySelector("#dialogInstall");
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;

window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();installPrompt=event});
window.addEventListener("appinstalled",()=>{installPrompt=null;document.querySelector("#installButton").hidden=true;installDialog.close();toast("AGamey installed!")});

function showInstall(){
  if(isStandalone)return toast("AGamey is already installed.");
  installMessage.textContent=isIOS?"On iPhone or iPad, tap the Share button in your browser, then choose Add to Home Screen.":"Get faster access to the latest gaming news in a full-screen app experience.";
  dialogInstall.textContent=isIOS?"Got it":"Install AGamey";
  installDialog.showModal();
}

async function installApp(){
  if(isIOS){installDialog.close();return}
  if(!installPrompt){installMessage.textContent="Your browser's install option is in its main menu. Look for Install app or Add to Home screen.";dialogInstall.textContent="Close";return}
  await installPrompt.prompt();
  const choice=await installPrompt.userChoice;
  if(choice.outcome!=="accepted")toast("You can install anytime from the Install App button.");
  installPrompt=null;installDialog.close();
}
document.querySelector("#searchInput").addEventListener("input",event=>renderAll(event.target.value));
document.querySelector("#mobileSearch").addEventListener("click",()=>{const header=document.querySelector(".site-header");header.classList.toggle("search-open");if(header.classList.contains("search-open"))document.querySelector("#searchInput").focus()});
document.querySelector(".menu-toggle").addEventListener("click",event=>{const header=document.querySelector(".site-header");const open=header.classList.toggle("menu-open");event.currentTarget.setAttribute("aria-expanded",String(open))});
document.querySelectorAll(".main-nav a").forEach(link=>link.addEventListener("click",()=>document.querySelector(".site-header").classList.remove("menu-open")));
document.querySelectorAll('[data-placeholder="social"]').forEach(link=>link.addEventListener("click",event=>{event.preventDefault();toast("Social link coming soon — add your profile URL here.")}));
document.querySelector("#installButton").addEventListener("click",showInstall);
document.querySelector("#dialogInstall").addEventListener("click",installApp);
document.querySelector("#dialogClose").addEventListener("click",()=>installDialog.close());
installDialog.addEventListener("click",event=>{if(event.target===installDialog)installDialog.close()});
if(isStandalone)document.querySelector("#installButton").hidden=true;
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
document.querySelector("#year").textContent=new Date().getFullYear();
loadNews();
