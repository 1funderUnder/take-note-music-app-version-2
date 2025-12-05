import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { localdb } from "./localdb.js";

const firebaseConfig = {
  apiKey: "AIzaSyCvN8UoSvnmROCdBM1cETbuIs1R_i-Eius",
  authDomain: "take-note-c2457.firebaseapp.com",
  projectId: "take-note-c2457",
  storageBucket: "take-note-c2457.firebasestorage.app",
  messagingSenderId: "825397545661",
  appId: "1:825397545661:web:1a6ec74f508926c24ec5d4",
  measurementId: "G-4G9VVHE7H3"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);                   

// Check if online
function isOnline() {
  return navigator.onLine;
}

// Get current userID (or null if not logged in)
export function getCurrentUserId() {
  return auth.currentUser ? auth.currentUser.uid : null;
}

// Wait for auth state to be ready
export function waitForAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// Practice sessions

export async function addPracticeSession(data) {
  const userId = getCurrentUserId();
  if (!userId) {
    console.error("User not logged in");
    return { error: "Not authenticated" };
  }

  // Add userId to data

  const sessionWithUser = { ...data, userId };

  if (!isOnline()) {
    // Save to IndexedDB queue when offline
    const id = await localdb.savePracticeOffline(sessionWithUser);
    await localdb.queuePractice({ ...sessionWithUser, id });
    return { id, offline: true };
  }

  try {
    const docRef = await addDoc(collection(db, "practiceSessions"), sessionWithUser);
    // Also save to IndexedDB for offline access
    await localdb.savePracticeOffline({ ...sessionWithUser, id: docRef.id });
    return { id: docRef.id, offline: false };
  } catch (error) {
    console.warn("Firebase save failed, saving offline:", error);
    const id = await localdb.savePracticeOffline(sessionWithUser);
    await localdb.queuePractice({ ...sessionWithUser, id });
    return { id, offline: true };
  }
}

export async function getPracticeSessions() {
  const userId = getCurrentUserId();
  if(!userId) {
    console.log("User not logged in. Returning empty data.");
    return [];
  }

  if (!isOnline()) {
    console.log("Offline: Loading from IndexedDB");
    const sessions = await localdb.getPracticeOffline();
    // Filter by userId for offline data
    return sessions.filter(s => s.userId === userId);
  }

  try {
    // Only this user's sessions
    const q = query(collection(db, "practiceSessions"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sync to IndexedDB for offline use (only this user)
    await localdb.replaceAllPractice(sessions);
    
    return sessions;
  } catch (error) {
    console.warn("Firebase unavailable, loading from IndexedDB:", error);
    const sessions = await localdb.getPracticeOffline();
    return sessions.filter(s => s.userId === userId);
  }
}

// Saved songs

export async function addSavedSong(song) {
  const userId = getCurrentUserId();
  if (!userId) {
    console.error("User not logged in");
    return { error: "Not authenticated"};
  }

// Add userId to song
  const songWithUser = { ...song, userId };

  if (!isOnline()) {
    const id = await localdb.saveSongOffline(songWithUser);
    await localdb.queueSong({ ...songWithUser, id });
    return { id, offline: true };
  }

  try {
    const docRef = await addDoc(collection(db, "savedSongs"), songWithUser);
    await localdb.saveSongOffline({ ...songWithUser, id: docRef.id });
    return { id: docRef.id, offline: false };
  } catch (error) {
    console.warn("Firebase save failed, saving song offline:", error);
    const id = await localdb.saveSongOffline(songWithUser);
    await localdb.queueSong({ ...songWithUser, id });
    return { id, offline: true };
  }
}

export async function getSavedSongs() {
  const userId = getCurrentUserId();
  if(!userId) {
    console.log("User not logged in, returning empty data.");
    return [];
  }

  if (!isOnline()) {
    console.log("Offline: Loading songs from IndexedDB");
    const songs = await localdb.getSongsOffline();
    return songs.filter(s => s.userId === userId);
  }

  try {
    // Just this user's songs
    const q = query(collection(db, "savedSongs"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const songs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sync to IndexedDB
    await localdb.replaceAllSongs(songs);
    
    return songs;
  } catch (error) {
    console.warn("Firebase unavailable, loading songs from IndexedDB:", error);
    const songs = await localdb.getSongsOffline();
    return songs.filter(s => s.userId === userId);
  }
}

// Sync queued items when coming back online
export async function syncQueuedData() {
  if (!isOnline()) return;

  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    // Sync practice sessions
    const queuedPractice = await localdb.getOutboxPractice();
    for (const session of queuedPractice) {
      // only for this user
      if (session.userId !== userId) continue;
      try {
        await addDoc(collection(db, "practiceSessions"), {
          date: session.date,
          instrument: session.instrument,
          song: session.song,
          minutes: session.minutes,
          notes: session.notes,
          userId: session.userId
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
      if (song.userId !== userId) continue;
      try {
        await addDoc(collection(db, "savedSongs"), {
          artist: song.artist,
          title: song.title,
          userId: song.userId
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
