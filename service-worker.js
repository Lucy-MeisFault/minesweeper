


//so on saturday evening i realised that i cant really do anything here cause all the minesweeping is done on the server so uhh this is just a blank slate




const CACHE = "minesweeper-v1";
const SHELL = [
    "/",
    "/index.html",
    "/style.css",
    "/script.js",
    "/manifest.json"
];


self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(SHELL))
    );
});


self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});
