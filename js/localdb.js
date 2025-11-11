const DB_NAME = "take-note-db";
const DB_VERSION = 1;
let dbPromise;

// Open DB
function openDB() {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    
    req.onupgradeneeded = (e) => {
      const db = req.result;
      
      if (!db.objectStoreNames.contains("practiceSessions")) {
        db.createObjectStore("practiceSessions", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("savedSongs")) {
        db.createObjectStore("savedSongs", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("outbox_practice")) {
        db.createObjectStore("outbox_practice", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("outbox_songs")) {
        db.createObjectStore("outbox_songs", { keyPath: "id" });
      }
    };
    
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  
  return dbPromise;
}

// Get transaction
function tx(store, mode = "readonly") {
  return openDB().then(db => db.transaction(store, mode).objectStore(store));
}

// Put single item
function put(store, obj) {
  return new Promise(async (resolve, reject) => {
    try {
      const os = await tx(store, "readwrite");
      const req = os.put(obj);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

// Bulk put
function bulkPut(store, arr) {
  return Promise.all(arr.map(x => put(store, x)));
}

// Get all items
function getAll(store) {
  return new Promise(async (resolve, reject) => {
    try {
      const os = await tx(store, "readonly");
      const req = os.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

// Remove single item
function remove(store, key) {
  return new Promise(async (resolve, reject) => {
    try {
      const os = await tx(store, "readwrite");
      const req = os.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

// Clear all items from store
function clearStore(store) {
  return new Promise(async (resolve, reject) => {
    try {
      const os = await tx(store, "readwrite");
      const req = os.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export const localdb = {
  // Practice Sessions
  
  async savePracticeOffline(session) {
    const id = session.id || `local_practice_${crypto.randomUUID()}`;
    await put("practiceSessions", { ...session, id });
    return id;
  },
  
  async getPracticeOffline() {
    return getAll("practiceSessions");
  },
  
  async replaceAllPractice(sessions) {
    await clearStore("practiceSessions");
    return bulkPut("practiceSessions", sessions.map(s => ({
      ...s,
      id: s.id || `cloud_practice_${crypto.randomUUID()}`
    })));
  },
  
  async clearAllPractice() {
    return clearStore("practiceSessions");
  },

  // Saved Songs
  
  async saveSongOffline(song) {
    const id = song.id || `local_song_${crypto.randomUUID()}`;
    await put("savedSongs", { ...song, id });
    return id;
  },
  
  async getSongsOffline() {
    return getAll("savedSongs");
  },
  
  async replaceAllSongs(songs) {
    await clearStore("savedSongs");
    return bulkPut("savedSongs", songs.map(s => ({
      ...s,
      id: s.id || `cloud_song_${crypto.randomUUID()}`
    })));
  },

  // Outbox
  
  async queuePractice(session) {
    const id = session.id || `queued_practice_${crypto.randomUUID()}`;
    await put("outbox_practice", { ...session, id, queuedAt: Date.now() });
    return id;
  },
  
  async queueSong(song) {
    const id = song.id || `queued_song_${crypto.randomUUID()}`;
    await put("outbox_songs", { ...song, id, queuedAt: Date.now() });
    return id;
  },
  
  async getOutboxPractice() {
    return getAll("outbox_practice");
  },
  
  async getOutboxSongs() {
    return getAll("outbox_songs");
  },
  
  async clearOutboxPractice(id) {
    return remove("outbox_practice", id);
  },
  
  async clearOutboxSong(id) {
    return remove("outbox_songs", id);
  }
};