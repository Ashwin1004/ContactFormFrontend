// DOM elements
const statusEl = document.getElementById("status");
const feedbackEl = document.getElementById("feedback");
const form = document.getElementById("contactForm");

// Your backend API endpoint (Render)
const API_URL = "https://contactform-2-25nd.onrender.com/api/email/send";

// Open IndexedDB
let db;
const request = indexedDB.open("ContactFormDB", 1);

request.onupgradeneeded = function (event) {
  db = event.target.result;
  db.createObjectStore("submissions", { autoIncrement: true });
  console.log("✅ IndexedDB setup complete");
};

request.onsuccess = function (event) {
  db = event.target.result;
  console.log("✅ IndexedDB ready");
  if (navigator.onLine) syncSubmissions();
};

request.onerror = function (event) {
  console.error("❌ IndexedDB error:", event.target.errorCode);
};

// Update online/offline status
function updateStatus() {
  if (navigator.onLine) {
    statusEl.textContent = "🟢 Online";
    statusEl.className = "online";
    syncSubmissions();
  } else {
    statusEl.textContent = "🔴 Offline";
    statusEl.className = "offline";
  }
}
updateStatus();
window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);

// Save submission to IndexedDB
function saveToIndexedDB(data) {
  const tx = db.transaction("submissions", "readwrite");
  tx.objectStore("submissions").add(data);
  console.log("📩 Saved offline:", data);
}

// Sync submissions when back online
function syncSubmissions() {
  const tx = db.transaction("submissions", "readwrite");
  const store = tx.objectStore("submissions");
  const getAll = store.getAll();

  getAll.onsuccess = async function () {
    const submissions = getAll.result;
    if (submissions.length > 0) {
      console.log("🔄 Syncing submissions:", submissions);
      for (let data of submissions) {
        try {
          const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (response.ok) {
            console.log("✅ Synced:", data);
            store.clear(); // clear after successful sync
            feedbackEl.textContent = "✅ Offline submissions synced!";
          }
        } catch (err) {
          console.error("❌ Sync failed:", err);
        }
      }
    }
  };
}

// Form submit handler
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const formData = {
    recipientEmail: document.getElementById("recipientEmail").value,
    userEmail: document.getElementById("userEmail").value,
    subject: document.getElementById("subject").value,
    body: document.getElementById("body").value,
  };

  if (navigator.onLine) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        feedbackEl.textContent = "✅ Email sent successfully!";
        form.reset();
      } else {
        feedbackEl.textContent = "⚠️ Failed to send email. Try again.";
      }
    } catch (err) {
      console.error("❌ Error:", err);
      feedbackEl.textContent = "⚠️ Error sending email.";
    }
  } else {
    saveToIndexedDB(formData);
    feedbackEl.textContent = "📩 Saved locally. Will sync when online.";
    form.reset();
  }
});
