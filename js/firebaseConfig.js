import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { localdb } from "./localdb.js";

const firebaseConfig = {
  apiKey: "AIzaSyCvN8UoSvnmROCdBM1cETbuIs1R_i-Eius",
  authDomain: "take-note-c2457.firebaseapp.com",
  projectId: "take-note-c2457",
  storageBucket: "take-note-c2457.firebasestorage.app",
  messagingSenderId: "825397545661",
  appId: "1:825397545661:web:1a6ec74f508926c24ec5d4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Check if online
function isOnline() {
  return navigator.onLine;
}

// Practice sessions

export async function addPracticeSession(data) {
  if (!isOnline()) {
    // Save to IndexedDB queue when offline
    const id = await localdb.savePracticeOffline(data);
    await localdb.queuePractice({ ...data, id });
    return { id, offline: true };
  }

  try {
    const docRef = await addDoc(collection(db, "practiceSessions"), data);
    // Also save to IndexedDB for offline access
    await localdb.savePracticeOffline({ ...data, id: docRef.id });
    return { id: docRef.id, offline: false };
  } catch (error) {
    console.warn("Firebase save failed, saving offline:", error);
    const id = await localdb.savePracticeOffline(data);
    await localdb.queuePractice({ ...data, id });
    return { id, offline: true };
  }
}

export async function getPracticeSessions() {
  if (!isOnline()) {
    console.log("Offline: Loading from IndexedDB");
    return await localdb.getPracticeOffline();
  }

  try {
    const snapshot = await getDocs(collection(db, "practiceSessions"));
    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sync to IndexedDB for offline use
    await localdb.replaceAllPractice(sessions);
    
    return sessions;
  } catch (error) {
    console.warn("Firebase unavailable, loading from IndexedDB:", error);
    return await localdb.getPracticeOffline();
  }
}

// Saved songs

export async function addSavedSong(song) {
  if (!isOnline()) {
    const id = await localdb.saveSongOffline(song);
    await localdb.queueSong({ ...song, id });
    return { id, offline: true };
  }

  try {
    const docRef = await addDoc(collection(db, "savedSongs"), song);
    await localdb.saveSongOffline({ ...song, id: docRef.id });
    return { id: docRef.id, offline: false };
  } catch (error) {
    console.warn("Firebase save failed, saving song offline:", error);
    const id = await localdb.saveSongOffline(song);
    await localdb.queueSong({ ...song, id });
    return { id, offline: true };
  }
}

export async function getSavedSongs() {
  if (!isOnline()) {
    console.log("Offline: Loading songs from IndexedDB");
    return await localdb.getSongsOffline();
  }

  try {
    const snapshot = await getDocs(collection(db, "savedSongs"));
    const songs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sync to IndexedDB
    await localdb.replaceAllSongs(songs);
    
    return songs;
  } catch (error) {
    console.warn("Firebase unavailable, loading songs from IndexedDB:", error);
    return await localdb.getSongsOffline();
  }
}

// Sync queued items when coming back online
export async function syncQueuedData() {
  if (!isOnline()) return;

  try {
    // Sync practice sessions
    const queuedPractice = await localdb.getOutboxPractice();
    for (const session of queuedPractice) {
      try {
        await addDoc(collection(db, "practiceSessions"), {
          date: session.date,
          instrument: session.instrument,
          song: session.song,
          minutes: session.minutes,
          notes: session.notes
        });
        await localdb.clearOutboxPractice(session.id);
        console.log("Synced practice session:", session.id);
      } catch (err) {
        console.error("Failed to sync practice session:", err);
      }
    }

    // Sync songs
    const queuedSongs = await localdb.getOutboxSongs();
    for (const song of queuedSongs) {
      try {
        await addDoc(collection(db, "savedSongs"), {
          artist: song.artist,
          title: song.title
        });
        await localdb.clearOutboxSong(song.id);
        console.log("Synced song:", song.id);
      } catch (err) {
        console.error("Failed to sync song:", err);
      }
    }

    if (queuedPractice.length > 0 || queuedSongs.length > 0) {
      console.log("Sync complete!");
      // Refresh data after sync
      await getPracticeSessions();
      await getSavedSongs();
    }
  } catch (error) {
    console.error("Sync failed:", error);
  }
}

// Listen for online event
window.addEventListener('online', async () => {
  console.log("Connection restored! Syncing...");
  await syncQueuedData();
});
