// IndexedDB setup
let db;
const request = indexedDB.open("ContactFormDB", 1);

request.onerror = (event) => {
  console.error("IndexedDB error:", event.target.errorCode);
};

request.onsuccess = (event) => {
  db = event.target.result;
  console.log("✅ IndexedDB opened successfully");
};

request.onupgradeneeded = (event) => {
  db = event.target.result;
  if (!db.objectStoreNames.contains("forms")) {
    db.createObjectStore("forms", { keyPath: "id", autoIncrement: true });
  }
  console.log("📦 Object store created");
};

// Save form when offline
function saveFormOffline(formData) {
  const tx = db.transaction("forms", "readwrite");
  const store = tx.objectStore("forms");
  store.add(formData);
  console.log("💾 Form saved offline:", formData);
}

// Send form to backend
async function sendFormOnline(formData) {
  try {
    console.log("🌍 Sending to backend:", formData);

    const response = await fetch("https://contactform-2-25nd.onrender.com/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Backend error:", errorText);
      return false;
    }

    console.log("📨 Form sent successfully:", await response.text());
    return true;
  } catch (error) {
    console.error("⚠️ Network/Fetch error:", error);
    return false;
  }
}

// Send all saved forms when back online
function sendStoredForms() {
  const tx = db.transaction("forms", "readwrite");
  const store = tx.objectStore("forms");

  store.getAll().onsuccess = async (event) => {
    const forms = event.target.result;
    for (let form of forms) {
      const sent = await sendFormOnline(form);
      if (sent) {
        store.delete(form.id);
        console.log("✅ Offline form sent & removed:", form);
      }
    }
  };
}

// Handle form submission
const feedbackEl = document.getElementById("feedback");
document.getElementById("contactForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const formData = {
    recipientEmail: document.getElementById("recipientEmail").value,
    userEmail: document.getElementById("userEmail").value,
    subject: document.getElementById("subject").value,
    body: document.getElementById("body").value,
  };

  if (navigator.onLine) {
    sendFormOnline(formData).then((sent) => {
      if (sent) {
        feedbackEl.textContent = "✅ Submitted successfully!";
        feedbackEl.style.color = "green";
      } else {
        saveFormOffline(formData);
        feedbackEl.textContent = "⚠️ Saved locally, backend rejected!";
        feedbackEl.style.color = "orange";
      }
    });
  } else {
    saveFormOffline(formData);
    feedbackEl.textContent = "📩 Saved locally, please come online to send.";
    feedbackEl.style.color = "red";
  }

  e.target.reset();
});

// Auto-send stored forms when online again
window.addEventListener("online", sendStoredForms);
