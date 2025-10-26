const CACHE_NAME = "task-manager-v16";
const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/pages/about.html",
    "/pages/contact.html",
    "/css/materialize.min.css",
    "/js/materialize.min.js",
    "/js/ui.js",
    "/img/MyMusicAppLogo.png",
    "/img/MyMusicAppLogo192x192.png",
    "/img/MyMusicAppLogo512x512.png",
    "/img/screenshots/home-screen.jpg",
    "/img/screenshots/mystats-screen.jpg",
    "/img/screenshots/saved-songs.jpg",
    "/pages/songList.html",
    "/pages/savedSongs.html",
    "/pages/myStats.html",
    "/css/styles.css"
];

// Install Event
self.addEventListener("install", (event) => {
    console.log("Service Worker: Installing...");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
        console.log("Service Worker: caching files");
        return cache.addAll(ASSETS_TO_CACHE);
     })  
    );
});

// Activate Event
self.addEventListener("activate", (event) => {
    console.log("Service Worker: Activating...");
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                if(cache !== CACHE_NAME) {
                    console.log("Service Worker: Deleting Old Cache");
                    return caches.delete(cache);
                }
            })
        );
     })
    );
});

// Fetch Event
self.addEventListener("fetch", event => {
  // Skip non-HTTP requests (like chrome-extension://)
  if (!event.request.url.startsWith("http")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request).then(res => {
          // Only cache successful responses
          if (res && res.status === 200 && res.type === "basic") {
            const responseClone = res.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return res;
        })
      );
    })
  );
});
