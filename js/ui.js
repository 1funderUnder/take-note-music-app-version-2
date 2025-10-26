document.addEventListener("DOMContentLoaded", function() {
  // Init sidenav
  const menus = document.querySelectorAll(".sidenav");
  M.Sidenav.init(menus, { edge: "right" });

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

  // Update progress bar and render table (My Stats page)
  const progressBar = document.querySelector("#progress-bar");
  if (progressBar) {
    updateProgressBar();
    renderPracticeLog();
  }

  // Reset progress button
  const resetBtn = document.querySelector("#reset-data");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem("practiceSessions");
      localStorage.removeItem("totalMinutes");
      updateProgressBar();
      renderPracticeLog();
      updateDashboard();
      M.toast({ html: "Progress reset." });
    });
  }
});

// Dashboard summary
function updateDashboard() {
  const dashboard = document.getElementById("dashboard");
  if (!dashboard) return;

  const sessions = JSON.parse(localStorage.getItem("practiceSessions")) || [];
  const totalMinutes = parseInt(localStorage.getItem("totalMinutes"), 10) || 0;
  const goal = 300;
  const percent = Math.min((totalMinutes / goal) * 100, 100);

  // Update metrics
  const lastPractice = sessions.length
    ? new Date(Math.max(...sessions.map(s => new Date(s.date)))).toLocaleDateString()
    : "No sessions yet";
  const longest = sessions.length
    ? Math.max(...sessions.map(s => s.minutes))
    : 0;

  const thisMonth = new Date().getMonth();
  const practicedDays = [
    ...new Set(
      sessions
        .filter(s => new Date(s.date).getMonth() === thisMonth)
        .map(s => s.date)
    ),
  ].length;

  // Update UI
  document.getElementById("total-minutes").textContent =
    `Total Minutes Practiced: ${totalMinutes}`;
  document.getElementById("last-practiced").textContent =
    `Last Practiced: ${lastPractice}`;
  document.getElementById("longest-session").textContent =
    `Longest Session: ${longest} minutes`;
  document.getElementById("days-this-month").textContent =
    `Days Practiced This Month: ${practicedDays}`;

  // Progress bar
  const bar = document.getElementById("progress-bar");
  if (bar) bar.style.width = `${percent}%`;
  const text = document.getElementById("progress-text");
  if (text) text.textContent = `${totalMinutes} / ${goal} minutes`;
}

// Run dashboard update when the DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  updateDashboard();
});

// Save Practice Session
function savePracticeSession() {
  const date = document.querySelector("#practice_date").value;
  const instrument = document.querySelector("#instrument").value.trim();
  const song = document.querySelector("#song").value.trim();
  const minutes = parseInt(document.querySelector("#minutes").value, 10) || 0;
  const notes = document.querySelector("#notes").value.trim();

  if (!date || !instrument || !song || minutes <= 0) {
    M.toast({ html: "Please complete all fields with valid data." });
    return;
  }

  // Retrieve existing sessions
  let sessions = JSON.parse(localStorage.getItem("practiceSessions")) || [];

  // Check if this song/instrument combo already exists → add minutes to it
  const existing = sessions.find(
    s =>
      s.song.toLowerCase() === song.toLowerCase() &&
      s.instrument.toLowerCase() === instrument.toLowerCase()
  );

  if (existing) {
    existing.minutes += minutes;
    existing.date = date; // update to latest date
    existing.notes = notes || existing.notes;
  } else {
    sessions.push({ date, instrument, song, minutes, notes });
  }

  localStorage.setItem("practiceSessions", JSON.stringify(sessions));

  // Update total minutes
  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  localStorage.setItem("totalMinutes", totalMinutes);

  // Refresh dashboard
  updateDashboard();

  // Update progress bar instantly
  updateProgressBar();

  // Clear form fields
  document.querySelector("#practice_date").value = "";
  document.querySelector("#instrument").value = "";
  document.querySelector("#song").value = "";
  document.querySelector("#minutes").value = "";
  document.querySelector("#notes").value = "";
  M.updateTextFields();

  M.toast({ html: "Practice session saved!" });
}

// Update Progress Bar (used on both pages)
function updateProgressBar() {
  const goal = 300;
  const totalMinutes = parseInt(localStorage.getItem("totalMinutes"), 10) || 0;
  const percent = Math.min((totalMinutes / goal) * 100, 100);

  const bar = document.querySelector("#progress-bar");
  const text = document.querySelector("#progress-text");

  if (bar) bar.style.width = `${percent}%`;
  if (text) text.textContent = `${totalMinutes} / ${goal} minutes`;
}

// Render Practice Log (used on My Stats page)
function renderPracticeLog() {
  console.log("Rendering practice log…");
  const container = document.querySelector("#practice-log");
  if (!container) return;

  const sessions = JSON.parse(localStorage.getItem("practiceSessions")) || [];

  if (sessions.length === 0) {
    container.innerHTML = "<p>No sessions yet.</p>";
    return;
  }

  // Sort by date (latest first)
  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

  let html = `
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
  `;

  sessions.forEach(s => {
    html += `
      <tr>
        <td>${s.date}</td>
        <td>${s.instrument}</td>
        <td>${s.song}</td>
        <td>${s.minutes}</td>
        <td>${s.notes || ""}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

// Handle "Add Song" button
document.addEventListener("DOMContentLoaded", function () {
  const addSongBtn = document.getElementById("add-song-btn");

  if (addSongBtn) {
    addSongBtn.addEventListener("click", function (e) {
      e.preventDefault();

      // Get input values
      const artist = document.getElementById("artist_name_1").value.trim();
      const title = document.getElementById("song_title_1").value.trim();

      if (!artist || !title) {
        M.toast({ html: "Please fill out both fields", classes: "red lighten-2" });
        return;
      }

      // Retrieve saved songs from localStorage (or empty array if none)
      let savedSongs = JSON.parse(localStorage.getItem("savedSongs")) || [];

      // Add new song
      savedSongs.push({ artist, title });
    
      // Save back to localStorage
      localStorage.setItem("savedSongs", JSON.stringify(savedSongs));

      // Update dashboard after saving
      updateDashboard();

       // Clear fields
      document.getElementById("artist_name_1").value = "";
      document.getElementById("song_title_1").value = "";

      // Show success message
    M.toast({
    html: "Your song has been added to your songs list!",
    displayLength: 3000,
    classes: "purple lighten-1 white-text rounded"
    });

         // Add an animation on the button
      addSongBtn.classList.add("pulse");
      setTimeout(() => addSongBtn.classList.remove("pulse"), 1000);
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  // Code for savedSongs page
  if (document.getElementById("saved-songs-list")) {
    const listContainer = document.getElementById("saved-songs-list");
    let savedSongs = JSON.parse(localStorage.getItem("savedSongs")) || [];

    // Render saved songs
    if (savedSongs.length === 0) {
      listContainer.innerHTML = "<p class='grey-text'>No songs saved yet</p>";
    } else {
    listContainer.innerHTML = savedSongs
    .map(
    (song, i) => `
    <div class="card hoverable song-card" data-index="${i}">
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
    `
  )
  .join("");
}
const totalSongs = savedSongs.length;
const msg =
  totalSongs === 0
    ? "Let's add your first song!"
    : totalSongs < 5
    ? "You're just getting started – keep adding more songs!"
    : totalSongs < 10
    ? "You're building a great list – keep going!"
    : "Music master in the making!";

const songsTotalEl = document.getElementById("songs-total");
const songsMsgEl = document.getElementById("songs-message");
if (songsTotalEl && songsMsgEl) {
  songsTotalEl.textContent = `Songs in your list: ${totalSongs}`;
  songsMsgEl.textContent = msg;
}

    // Handle delete buttons
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = e.target.closest(".song-card");
        const index = card.dataset.index;

        // Fade-out animation
        card.classList.add("fade-out");

        setTimeout(() => {
          // Remove song from storage
          savedSongs.splice(index, 1);
          localStorage.setItem("savedSongs", JSON.stringify(savedSongs));

          // Remove element from DOM
          card.remove();

          // Show removal message
          M.toast({
           html: "Song removed",
          classes: "red lighten-2 white-text rounded"
          });
         
          // Show empty message if no songs remain
          if (savedSongs.length === 0) {
            listContainer.innerHTML = "<p class='grey-text'>No songs saved yet</p>";
          }
        }, 400);
      });
    });
  }
});





