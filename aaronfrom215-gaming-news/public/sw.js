const VERSION="agamey-v1";
const APP_SHELL=["/","/index.html","/styles.css","/app.js","/manifest.webmanifest","/icons/icon-192.png","/icons/icon-512.png","/icons/apple-touch-icon.png"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith("/api/news")){
    event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(VERSION).then(cache=>cache.put(request,copy));return response}).catch(()=>caches.match(request)));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok)caches.open(VERSION).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>request.mode==="navigate"?caches.match("/index.html"):Response.error())));
});
