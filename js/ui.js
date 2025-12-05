import { addPracticeSession, getPracticeSessions, addSavedSong, getSavedSongs, db, auth, waitForAuth, getCurrentUserId } from "./firebaseConfig.js";
import { getDocs, collection, deleteDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { localdb } from "./localdb.js";

// Track auth state
let currentUser = null;

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

  // Wait for auth state to be ready
  await waitForAuth();

  // Listen for auth state changes
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    updateNavForAuth(user);

    if (user) {
      console.log("User logged in: ", user.email);

      // Initialize page content
      await initializePageContent();
    } else {
      console.log("User not logged in");

      // Redirect to sign in page if not on sign in page
      if (!window.location.pathname.includes('signin.html')) {

        // Allow viewing about and contact pages without logging in
        const publicPages = ['/pages/about.html', '/pages/contact.html'];
        if (!publicPages.some(page => window.location.pathname.includes(page))) {
          window.location.href = '/signin.html';
        }
      }
    }
  });

  // Add sign out listener
  const signOutBtn = document.getElementById("sign-out-btn");
 if (signOutBtn) {
  signOutBtn.addEventListener("click", handleSignOut);
 }
 
  // Add Save Session listener (Home page)
  const saveBtn = document.querySelector("#save-practice-button");
  if (saveBtn) {
    saveBtn.addEventListener("click", savePracticeSession);
  }

  // Resert progress button
  const resetBtn = document.querySelector("#reset-data");
  if (resetBtn) {
    resetBtn.addEventListener("click", handleResetData);
  }
});

// Initialize page content based on current page
async function initializePageContent() {

  // Update progress bar and render table for My Stats page
  const progressBar = document.querySelector("#progress-bar");
  if (progressBar) {
    await updateProgressBar();
    await renderPracticeLog();
  }

  // Initialize dashboard
  await updateDashboard();

  // Initialize saved songs if on that page
  const listContainer = document.getElementById("saved-songs-list");
  if (listContainer) {
    await renderSavedSongs();
  }
}

// Update nav based on auth state
function updateNavForAuth(user) {

  // Find all nav containers
  const desktopNav = document.querySelector('.hide-on-med-and-down');
  const mobileNav = document.querySelector('.sidenav');

  if (user) {

    // Add to desktop nav if it exists
    if (desktopNav) {

      // Remove existing auth elements
      const existingAuthElements = desktopNav.querySelectorAll('.auth-nav-item');
      existingAuthElements.forEach(el => el.remove());

      // Add new auth elements
      const authLi1 = document.createElement('li');
      authLi1.className = 'auth-nav-item';
      authLi1.innerHTML = `<a href="#!" style="font-size: 0.85em;"><i class="material-icons left">account_circle</i>${user.displayName || user.email.split('@')[0]}</a>`;

      const authLi2 = document.createElement('li');
      authLi2.className = 'auth-nav-item';
      authLi2.innerHTML = `<a href="#!" id="sign-out-btn-desktop">Sign Out</a>`;
      desktopNav.appendChild(authLi1);
      desktopNav.appendChild(authLi2);

      // Add sign out listener
      document.getElementById('sign-out-btn-desktop').addEventListener('click', handleSignOut);
    }

// Add to mobile nav it it exists
if (mobileNav) {
  
  // Remove existing auth elements
  const existingAuthElements = mobileNav.querySelectorAll('.auth-nav-item');
  existingAuthElements.forEach(el => el.remove());

  // Add divider and auth elements
  const dividerLi = document.createElement('li');
  dividerLi.className = 'auth-nav-item';
  dividerLi.innerHTML = '<div class="divider"></div>';

  const authLi1 = document.createElement('li');
  authLi1.className = 'auth-nav-item';
  authLi1.innerHTML = `<a href="#!"><i class="material-icons left">account_circle</i>${user.displayName || user.email}</a>`;

  const authLi2 = document.createElement('li');
  authLi2.className = 'auth-nav-item';
  authLi2.innerHTML = `<a href="#!" id="sign-out-btn-mobile"><i class="material-icons left">logout</i>Sign Out</a>`;

  mobileNav.appendChild(dividerLi);
  mobileNav.appendChild(authLi1);
  mobileNav.appendChild(authLi2);

  // Add signout listener
  document.getElementById('sign-out-btn-mobile').addEventListener('click', handleSignOut);
    }
  }
}

// Handle sign out
async function handleSignOut(e) {
  e.preventDefault();
  try {
    await signOut(auth);
    M.toast({ html: "Signed out successfully", classes: "green" });
    window.location.href = '/signin.html';
  } catch (error) {
    console.error("Sign out error: ", error);
    M.toast({ html: "Error signing out", classes: "red" });
    }
  }

  // Handle reset data
  async function handleResetData() {
    if (!confirm("Are you sure you want to delete all your sessions?")) return;

    const userId = getCurrentUserId();
    if (!userId) {
      M.toast({ html: "Please sign in first", classes: "red"});
      return;
    }
    try {

      // query this user's sessions
      const q = query(collection(db, "practiceSessions"), where("userId", "==", userId));
      const snapshot = await getDocs(q);
      const deletions = snapshot.docs.map(d => deleteDoc(doc(db, "practiceSessions", d.id)));
      await Promise.all(deletions);

      // Clear IndexedDb
      await localdb.clearAllPractice();
      await updateProgressBar();
      await renderPracticeLog();
      await updateDashboard();
      M.toast({ html: "All sessions deleted"});
    } catch (error) {
      console.error("Error deleting sessions: ", error);
      M.toast({ html: "Error deleting sessions", classes: "red"});
    }
  }

// Dashboard summary
async function updateDashboard() {
  const dashboard = document.getElementById("dashboard");
  if (!dashboard) return;

  // Check if user is logged in
  if (!getCurrentUserId()) {
    const tm = document.getElementById("total-minutes");
    if (tm) tm.textContent = "Please sign in to see your stats.";
    return;
  }

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

  // Check if user is logged in
  if (!getCurrentUserId()) {
    M.toast({ html: "Please sign in to save sessions", classes: "red" });
    window.location.href = '/signin.html';
  }

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

    if (result.error) {
      M.toast({ html: result.error, classes: "red" });
      return;
    }
 
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

  if (!getCurrentUserId()) {
    return;
  }
  
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

  if (!getCurrentUserId()) {
    container.innerHTML = "<p class='center-align grey-text'>Please sign in to view your sessions.</p>";
    return;
  }

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

      // Check if user is logged in
      if (!getCurrentUserId()) {
        M.toast({ html: "Please sign in to save songs", classes: "red" });
        window.location.href = '/signin.html';
        return;
      }

      const artist = document.getElementById("artist_name_1").value.trim();
      const title = document.getElementById("song_title_1").value.trim();

      if (!artist || !title) {
        M.toast({ html: "Please fill out both fields", classes: "red lighten-2" });
        return;
      }

      try {
        const songDoc = { artist, title };
        const result = await addSavedSong(songDoc);

        if (result.error) {
          M.toast({ html: result.error, classes: "red"});
          return;
        }

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

  if(!getCurrentUserId()) {
    listContainer.innerHTML = `<p class="grey-text center-align" style="margin-top:20px;"> Please sign in to 
    view your saved songs.</p>`;
    return;
  }

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
  if (listContainer && getCurrentUserId()) {
    await renderSavedSongs();
  }
});