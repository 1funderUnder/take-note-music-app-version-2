const CACHE_NAME = "take-note-v56"; 

// Static assets to cache
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/signin.html",
  "/pages/about.html",
  "/pages/contact.html",
  "/pages/songList.html",
  "/pages/savedSongs.html",
  "/pages/myStats.html",
  "/css/materialize.min.css",
  "/css/styles.css",
  "/js/materialize.min.js",
  "/img/MyMusicAppLogo.png",
  "/img/MyMusicAppLogo192x192.png",
  "/img/MyMusicAppLogo512x512.png",
  "https://fonts.googleapis.com/icon?family=Material+Icons"
];

// Install Event
self.addEventListener("install", (event) => {
  console.log("Installing...");
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("Caching app shell");
        // Try to cache but don't fail if some resources aren't available
        return cache.addAll(ASSETS_TO_CACHE).catch(err => {
          console.warn("Some resources failed to cache:", err);
        });
      })
  );
  
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  console.log("Activating...");

  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Removing old cache:", cache);
            return caches.delete(cache);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// Fetch Event - Network First Strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests or non-GET requests
  if (!request.url.startsWith("http") || request.method !== "GET") {
    return;
  }

  // Skip Live Server WebSocket and development tools
  if (url.protocol === "ws:" || 
      url.protocol === "wss:" ||
      url.pathname.includes("/ws") ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1") {
    return;
  }

  // Firebase Network only, no caching
  if (request.url.includes("firestore.googleapis.com")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: "offline" }), {
          headers: { "Content-Type": "application/json" },
          status: 503
        });
      })
    );
    return;
  }

  // Firebase scripts: Network first, cache fallback
  if (request.url.includes("gstatic.com/firebasejs")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Google Fonts: Cache first
  if (request.url.includes("fonts.googleapis.com") || 
      request.url.includes("fonts.gstatic.com")) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          return response;
        });
      })
    );
    return;
  }

  // All other requests: Network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone).catch(err => {
              console.warn("Failed to cache:", request.url, err);
            });
          });
        }
        
        return response;
      })
      .catch(async (error) => {
        console.log("Network failed, trying cache:", request.url);
        
        // Try to serve from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          console.log("Served from cache:", request.url);
          return cachedResponse;
        }
        
        // For HTML pages, try to return a fallback
        if (request.destination === "document" || request.headers.get("accept").includes("text/html")) {
          const indexFallback = await caches.match("/index.html");
          if (indexFallback) {
            return indexFallback;
          }
          
          // Last resort offline page
          return new Response(
            `<!DOCTYPE html>
            <html>
              <head>
                <title>Offline - Take Note</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                  }
                  .offline-msg {
                    text-align: center;
                    padding: 40px;
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                  }
                  h1 { 
                    font-size: 2.5em;
                    margin-bottom: 10px;
                  }
                  p { 
                    font-size: 1.2em;
                    margin: 10px 0;
                  }
                  .icon {
                    font-size: 4em;
                    margin-bottom: 20px;
                  }
                </style>
              </head>
              <body>
                <div class="offline-msg">
                  <div class="icon">🎵</div>
                  <h1>You're Offline</h1>
                  <p>Take Note is currently unavailable.</p>
                  <p>Please check your internet connection and try again.</p>
                </div>
              </body>
            </html>`,
            {
              headers: { "Content-Type": "text/html" },
              status: 503,
              statusText: "Service Unavailable"
            }
          );
        }
        
        // For other resources
        console.warn("No cache available for:", request.url);
        return new Response("", { 
          status: 503, 
          statusText: "Service Unavailable" 
        });
      })
  );
});