const statusEl = document.getElementById("status");
const feedbackEl = document.getElementById("feedback");

let db;

// 🔹 Open IndexedDB
const request = indexedDB.open("ContactFormDB", 1);
request.onupgradeneeded = function(event) {
  db = event.target.result;
  db.createObjectStore("submissions", { autoIncrement: true });
};
request.onsuccess = function(event) {
  db = event.target.result;
  console.log("✅ IndexedDB ready");
};
request.onerror = function(event) {
  console.error("❌ IndexedDB error:", event.target.errorCode);
};

// 🔹 Update Online/Offline Status
function updateStatus() {
  if (navigator.onLine) {
    statusEl.textContent = "🟢 Online";
    statusEl.className = "online";
    syncSubmissions(); // try sync when online
  } else {
    statusEl.textContent = "🔴 Offline";
    statusEl.className = "offline";
  }
}
updateStatus();
window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);

// 🔹 Form submit
document.getElementById("contactForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const formData = {
    recipientEmail: document.getElementById("recipientEmail").value,
    userEmail: document.getElementById("userEmail").value,
    subject: document.getElementById("subject").value,
    body: document.getElementById("body").value
  };

  if (navigator.onLine) {
    sendToServer(formData);
  } else {
    saveOffline(formData);
    feedbackEl.textContent = "📩 Saved locally. Will send when online.";
  }
});

// 🔹 Save offline
function saveOffline(data) {
  const tx = db.transaction("submissions", "readwrite");
  tx.objectStore("submissions").add(data);
}

// 🔹 Sync when online
function syncSubmissions() {
  const tx = db.transaction("submissions", "readwrite");
  const store = tx.objectStore("submissions");
  const getAll = store.getAll();

  getAll.onsuccess = function() {
    const submissions = getAll.result;
    if (submissions.length > 0) {
      submissions.forEach(data => sendToServer(data));
      store.clear();
    }
  };
}

// 🔹 Send to backend
function sendToServer(data) {
  fetch("https://contactform-2-25nd.onrender.com/api/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  .then(res => res.text())
  .then(msg => {
    feedbackEl.textContent = "✅ Sent successfully!";
    console.log("Server response:", msg);
  })
  .catch(err => {
    console.error("⚠️ Error sending:", err);
    saveOffline(data);
  });
}
