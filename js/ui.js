import { addPracticeSession, getPracticeSessions, addSavedSong, getSavedSongs, db } from "./firebaseConfig.js";
import { getDocs, collection, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { localdb } from "./localdb.js";

document.addEventListener("DOMContentLoaded", async function() {
  // Init sidenav
  const menus = document.querySelectorAll(".sidenav");
  M.Sidenav.init(menus, { edge: "right" });

  // Init datepicker
  const datepickers = document.querySelectorAll('.datepicker');
  M.Datepicker.init(datepickers, {
    format: 'yyyy-mm-dd',
    defaultDate: new Date(),
    setDefaultDate: true
  });

  // Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/serviceworker.js")
      .then(req => console.log("Service worker registered.", req))
      .catch(err => console.log("Service Worker registration failed", err));
  }

  // Add Save Session listener (Home page)
  const saveBtn = document.querySelector("#save-practice-button");
  if (saveBtn) {
    saveBtn.addEventListener("click", savePracticeSession);
  }

  // Update progress bar and render table for My Stats page
  const progressBar = document.querySelector("#progress-bar");
  if (progressBar) {
    await updateProgressBar();
    await renderPracticeLog();
  }

  // Reset progress button
  const resetBtn = document.querySelector("#reset-data");
  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete all sessions?")) return;
      
      try {
        const snapshot = await getDocs(collection(db, "practiceSessions"));
        const deletions = snapshot.docs.map(d => deleteDoc(doc(db, "practiceSessions", d.id)));
        await Promise.all(deletions);
        
        // Clear IndexedDB
        await localdb.clearAllPractice();
        
        await updateProgressBar();
        await renderPracticeLog();
        await updateDashboard();
        M.toast({ html: "All sessions deleted" });
      } catch (error) {
        console.error("Error deleting sessions:", error);
        M.toast({ html: "Error deleting sessions", classes: "red" });
      }
    });
  }

  // Initialize dashboard
  await updateDashboard();
});

// Dashboard summary
async function updateDashboard() {
  const dashboard = document.getElementById("dashboard");
  if (!dashboard) return;

  let sessions = [];
  try {
    sessions = await getPracticeSessions();
  } catch (e) {
    console.warn("Could not load sessions:", e);
    sessions = [];
  }

  const totalMinutes = sessions.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
  const goal = 300;
  const percent = Math.min((totalMinutes / goal) * 100, 100);

  const lastPractice = sessions.length
    ? new Date(Math.max(...sessions.map(s => new Date(s.date)))).toLocaleDateString()
    : "No sessions yet";

  const longest = sessions.length
    ? Math.max(...sessions.map(s => Number(s.minutes) || 0))
    : 0;

  const thisMonth = new Date().getMonth();
  const practicedDays = new Set(
    sessions
      .filter(s => new Date(s.date).getMonth() === thisMonth)
      .map(s => s.date)
  ).size;

  // Update the UI
  const tm = document.getElementById("total-minutes");
  const lp = document.getElementById("last-practiced");
  const ls = document.getElementById("longest-session");
  const dm = document.getElementById("days-this-month");
  
  if (tm) tm.textContent = `Total Minutes Practiced: ${totalMinutes}`;
  if (lp) lp.textContent = `Last Practiced: ${lastPractice}`;
  if (ls) ls.textContent = `Longest Practice Session: ${longest} Minutes`;
  if (dm) dm.textContent = `Days Practiced This Month: ${practicedDays}`;

  const bar = document.getElementById("progress-bar");
  if (bar) bar.style.width = `${percent}%`;
  
  const text = document.getElementById("progress-text");
  if (text) text.textContent = `${totalMinutes} / ${goal} Minutes`;
}

// Save Practice Session
async function savePracticeSession() {
  const date = document.querySelector("#practice_date").value;
  const instrument = document.querySelector("#instrument").value.trim();
  const song = document.querySelector("#song").value.trim();
  const minutes = parseInt(document.querySelector("#minutes").value, 10) || 0;
  const notes = document.querySelector("#notes").value.trim();

  if (!date || !instrument || !song || minutes <= 0) {
    M.toast({ html: "Please complete all fields with valid data." });
    return;
  }

  const sessionDoc = { date, instrument, song, minutes, notes };

  try {
    const result = await addPracticeSession(sessionDoc);
    
    if (result.offline) {
      M.toast({
        html: "You are offline. Session saved and will sync when online.",
        classes: "orange"
      });
    } else {
      M.toast({ html: "Practice session saved!" });
    }

    // Refresh dashboard and progress bar
    await updateDashboard();
    await updateProgressBar();

    // Clear form fields
    document.querySelector("#practice_date").value = "";
    document.querySelector("#instrument").value = "";
    document.querySelector("#song").value = "";
    document.querySelector("#minutes").value = "";
    document.querySelector("#notes").value = "";
    M.updateTextFields();
  } catch (error) {
    console.error("Error saving session:", error);
    M.toast({ html: "Error saving session", classes: "red" });
  }
}

// Update Progress Bar
async function updateProgressBar() {
  const goal = 300;
  let sessions = [];
  
  try {
    sessions = await getPracticeSessions();
  } catch {
    sessions = [];
  }
  
  const totalMinutes = sessions.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
  const percent = Math.min((totalMinutes / goal) * 100, 100);

  const bar = document.querySelector("#progress-bar");
  const text = document.querySelector("#progress-text");

  if (bar) bar.style.width = `${percent}%`;
  if (text) text.textContent = `${totalMinutes} / ${goal} minutes`;
}

// Render Practice Log
async function renderPracticeLog() {
  const container = document.querySelector("#practice-log");
  if (!container) return;

  let sessions = [];
  try {
    sessions = await getPracticeSessions();
  } catch {
    sessions = [];
  }

  if (sessions.length === 0) {
    container.innerHTML = "<p class='center-align grey-text'>No sessions yet.</p>";
    return;
  }

  // Sort by date (latest first)
  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  container.innerHTML = `
    <table class="striped responsive-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Instrument</th>
          <th>Song</th>
          <th>Minutes</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${sessions.map(s => `
          <tr>
            <td>${s.date}</td>
            <td>${s.instrument}</td>
            <td>${s.song}</td>
            <td>${s.minutes}</td>
            <td>${s.notes || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

// Handle "Add Song" button
document.addEventListener("DOMContentLoaded", function () {
  const addSongBtn = document.getElementById("add-song-btn");

  if (addSongBtn) {
    addSongBtn.addEventListener("click", async function (e) {
      e.preventDefault();

      const artist = document.getElementById("artist_name_1").value.trim();
      const title = document.getElementById("song_title_1").value.trim();

      if (!artist || !title) {
        M.toast({ html: "Please fill out both fields", classes: "red lighten-2" });
        return;
      }

      try {
        const songDoc = { artist, title };
        const result = await addSavedSong(songDoc);

        if (result.offline) {
          M.toast({
            html: "You are offline. Song saved and will sync when online.",
            classes: "orange"
          });
        } else {
          M.toast({
            html: "Song added to your list!",
            displayLength: 3000,
            classes: "purple lighten-1 white-text rounded"
          });
        }

        // Refresh song list
        await renderSavedSongs();
        await updateDashboard();

        // Clear fields
        document.getElementById("artist_name_1").value = "";
        document.getElementById("song_title_1").value = "";
        M.updateTextFields();

        // Animation
        addSongBtn.classList.add("pulse");
        setTimeout(() => addSongBtn.classList.remove("pulse"), 1000);
      } catch (error) {
        console.error("Error adding song:", error);
        M.toast({ html: "Error adding song", classes: "red" });
      }
    });
  }
});

// Render saved songs
async function renderSavedSongs() {
  const listContainer = document.getElementById("saved-songs-list");
  if (!listContainer) return;

  listContainer.innerHTML = `
    <div class="center-align grey-text" style="margin-top: 20px;">
      <div class="preloader-wrapper small active">
        <div class="spinner-layer spinner-purple-only">
          <div class="circle-clipper left">
            <div class="circle"></div>
          </div>
          <div class="gap-patch">
            <div class="circle"></div>
          </div>
          <div class="circle-clipper right">
            <div class="circle"></div>
          </div>
        </div>
      </div>
      <p style="color: #6a1b9a;">Loading your songs...</p>
    </div>
  `;

  let savedSongs = [];
  try {
    savedSongs = await getSavedSongs();
  } catch (e) {
    console.warn("Could not load songs:", e);
    savedSongs = [];
  }

  if (savedSongs.length === 0) {
    listContainer.innerHTML = `
      <p class="grey-text center-align" style="margin-top:20px;">
        No songs saved yet. Add your first song!
      </p>
    `;
    return;
  }

    listContainer.innerHTML = savedSongs.map(song => `
    <div class="card hoverable song-card" data-id="${song.id}">
      <div class="card-content">
        <span class="card-title purple-text text-darken-2">${song.title}</span>
        <p>Artist: ${song.artist}</p>
        <i class="material-icons purple-text small" title="Play Preview">music_note</i>
      </div>
      <div class="card-action right-align">
        <a href="#!" class="waves-effect waves-light btn purple delete-btn">
          <i class="material-icons right">delete</i>Delete
        </a>
      </div>
    </div>
  `).join("");

  // Attach delete handlers
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const card = e.target.closest(".song-card");
      const id = card.dataset.id;
      
      try {
        await deleteDoc(doc(db, "savedSongs", id));
        card.remove();
        M.toast({ html: "Song removed", classes: "red lighten-2 white-text rounded" });
        
        if (document.querySelectorAll(".song-card").length === 0) {
          listContainer.innerHTML = "<p class='grey-text center-align'>No songs saved yet</p>";
        }
      } catch (error) {
        console.error("Error deleting song:", error);
        M.toast({ html: "Error deleting song", classes: "red" });
      }
    });
  });
}

// Initialize saved songs page
document.addEventListener("DOMContentLoaded", async () => {
  const listContainer = document.getElementById("saved-songs-list");
  if (listContainer) {
    await renderSavedSongs();
  }
});