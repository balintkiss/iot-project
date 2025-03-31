// === Szenzor adatainak frissítése ===
async function fetchData() {
  try {
    const response = await fetch('https://api.thingspeak.com/channels/2875631/feeds.json?results=1');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    const lastEntry = data.feeds[0];

    const temp = parseFloat(lastEntry.field1);
    const humidity = parseFloat(lastEntry.field2);

    document.getElementById('temperature').innerText = temp + " °C";
    document.getElementById('humidity').innerText = humidity + " %";

    let overallStatus = "";
    let statusClass = "normal";

    if (temp > 30) {
      overallStatus += "🔥 Meleg van! ";
      statusClass = "high";
    } else if (temp < 18) {
      overallStatus += "❄️ Hideg van! ";
      statusClass = "low";
    }

    if (humidity > 60) {
      overallStatus += "💦 Magas a páratartalom! ";
      statusClass = "high";
    } else if (humidity < 30) {
      overallStatus += "💨 Száraz a levegő! ";
      statusClass = "low";
    }

    if (overallStatus === "") {
      overallStatus = '<i class="fas fa-circle-check" style="color: lightgreen;"></i> Megfelelő környezet';
      statusClass = "normal";
    }

    const statusEl = document.getElementById("overall-status");
    statusEl.innerHTML = overallStatus;
    statusEl.className = "status " + statusClass;
  } catch (error) {
    console.error("Error fetching data:", error);
    document.getElementById('temperature').innerText = "N/A";
    document.getElementById('humidity').innerText = "N/A";
    document.getElementById("overall-status").innerText = "Hálózati hiba. Ellenőrizze az internetkapcsolatot.";
    document.getElementById("overall-status").className = "status low";
  }
}
setInterval(fetchData, 5000);
fetchData();

// === "Tovább" gombhoz tartozó toggleCharts függvény ===
function toggleCharts() {
  const chartsDiv = document.getElementById("charts");
  const button = document.querySelector(".more-btn");

  if (chartsDiv.style.display === "none" || chartsDiv.style.display === "") {
    chartsDiv.style.display = "block";
    chartsDiv.style.opacity = "0";
    setTimeout(() => {
      chartsDiv.style.opacity = "1";
    }, 50);
    button.innerHTML = '<i class="fas fa-times"></i> Bezár';
  } else {
    chartsDiv.style.opacity = "0";
    setTimeout(() => {
      chartsDiv.style.display = "none";
    }, 300);
    button.innerHTML = '<i class="fas fa-chart-line"></i> Tovább';
  }
}

// === Admin modal, login és panel kezelése ===
function openAdminModal() {
  document.getElementById('adminModal').style.display = 'block';
  renderModalContent();
}

function closeAdminModal() {
  document.getElementById('adminModal').style.display = 'none';
}

function renderModalContent() {
  const modalBody = document.getElementById('modal-body');
  if (sessionStorage.getItem('admin') === 'true') {
    modalBody.innerHTML = `
      <h2>Admin Panel</h2>
      <div class="smart-plug-toggle">
        <div id="wifiStatus" class="smart-plug-status off">Wifi kikapcsolva</div>
        <label class="switch">
          <input type="checkbox" id="smartPlugToggle" onchange="toggleSmartPlug(this.checked)">
          <span class="slider"></span>
        </label>
        <span id="smartPlugStatus">Ki</span>
      </div>

      <button onclick="logoutAdmin()" class="logout-btn">Kijelentkezés</button>
    `;
    fetchSmartPlugStatus();
  } else {
    modalBody.innerHTML = `
      <h2>Admin bejelentkezés</h2>
      <form id="modalLoginForm">
        <input type="text" id="modalUsername" placeholder="Felhasználónév" required>
        <input type="password" id="modalPassword" placeholder="Jelszó" required>
        <button type="submit">Bejelentkezés</button>
        <div class="error" id="modalError"></div>
      </form>
    `;
    document.getElementById('modalLoginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('modalUsername').value;
      const password = document.getElementById('modalPassword').value;

      fetch('https://balintkiss-github-io.onrender.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
          document.getElementById('modalError').textContent = data.message || 'Hiba történt a bejelentkezés során.';
        }
      })
      .catch(error => {
        console.error('Hiba a bejelentkezés során:', error);
        document.getElementById('modalError').textContent = 'Hiba történt a bejelentkezés során.';
      });
    });
  }
}

// === Smart plug toggle kezelés MongoDB-vel ===
function toggleSmartPlug(isOn) {
  const statusText = document.getElementById('smartPlugStatus');
  const wifiStatus = document.getElementById('wifiStatus');

  statusText.innerText = isOn ? "Be" : "Ki";
  wifiStatus.innerText = isOn ? "Wifi bekapcsolva" : "Wifi kikapcsolva";
  wifiStatus.className = 'smart-plug-status ' + (isOn ? 'on' : 'off');

  // Save state locally
  localStorage.setItem('smartPlugState', isOn ? 'on' : 'off');

  // Still attempt API call but don't rely on it
  try {
    fetch('https://balintkiss-github-io.onrender.com/api/smartplug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isOn })
    })
    .then(response => response.json())
    .then(data => {
      console.log("Smart plug válasz:", data);
    })
    .catch(error => console.error("Hiba a smart plug váltásakor:", error));
  } catch (e) {
    console.log("API nem elérhető, de a helyi állapot mentve");
  }
}

function fetchSmartPlugStatus() {
  // Változó a szerver kérés nyomon követésére
  let serverRequestSent = false;
  
  // Helyi állapot ellenőrzése
  const savedState = localStorage.getItem('smartPlugState');
  if (savedState) {
    const isOn = savedState === 'on';
    updatePlugUI(isOn);
  }

  // Szerverről lekérés
  try {
    serverRequestSent = true;
    fetch('https://balintkiss-github-io.onrender.com/api/smartplug', {
      credentials: 'include'
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Szerver hiba: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      // Csak akkor frissítsük az UI-t, ha különbözik a helyi állapottól
      const serverIsOn = data.isOn;
      const currentLocalState = localStorage.getItem('smartPlugState') === 'on';
      
      if (currentLocalState !== serverIsOn) {
        console.log("Szerver állapot eltér a helyitől, frissítés...");
        localStorage.setItem('smartPlugState', serverIsOn ? 'on' : 'off');
        updatePlugUI(serverIsOn);
      }
    })
    .catch(error => {
      console.error('Nem sikerült lekérdezni a smart plug állapotát:', error);
    });
  } catch (e) {
    console.log("API nem elérhető, helyi állapot használva");
  }
  
  // Ha 5 másodpercen belül nem kapunk választ a szervertől, 
  // maradjunk a helyi állapotnál
  setTimeout(() => {
    if (serverRequestSent) {
      console.log("Szerver válasz időtúllépés - helyi állapot megtartása");
    }
  }, 5000);
}

function logoutAdmin() {
  fetch('https://balintkiss-github-io.onrender.com/logout', {
    method: 'POST',
    credentials: 'include'
  })
  .then(response => response.json())
  .then(data => {
    sessionStorage.removeItem('admin');
    closeAdminModal();
  })
  .catch(error => console.error('Kijelentkezési hiba:', error));
}

window.onclick = function(event) {
  const modal = document.getElementById('adminModal');
  if (event.target === modal) {
    closeAdminModal();
  }
};

// === Cookie banner ===
function checkCookiePermission() {
  if (navigator.userAgent.includes('Chrome') && !localStorage.getItem('cookiesAccepted')) {
    document.getElementById('cookie-banner').style.display = 'block';
  }
}

function acceptCookies() {
  localStorage.setItem('cookiesAccepted', 'true');
  document.getElementById('cookie-banner').style.display = 'none';
  location.reload(); // újratöltés, hogy a session is újra próbálkozzon
}

window.onload = checkCookiePermission;
