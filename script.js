// === Szenzor adatainak frissítése ===
async function fetchData() {
    try {
      const response = await fetch('https://api.thingspeak.com/channels/2875631/feeds.json?results=1');
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
  
      document.getElementById("overall-status").innerHTML = overallStatus;
      document.getElementById("overall-status").className = "status " + statusClass;
    } catch (error) {
      console.error("Error fetching data:", error);
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
    // Ha az admin már be van jelentkezve, az admin panel jelenjen meg,
    // különben a login űrlap, mely fetch hívással a szerver /login végponthoz küld.
    if (sessionStorage.getItem('admin') === 'true') {
      modalBody.innerHTML = `
        <h2>Admin Panel</h2>
        <div class="smart-plug-toggle">
          <label class="switch">
            <input type="checkbox" id="smartPlugToggle" onchange="toggleSmartPlug(this.checked)">
            <span class="slider"></span>
          </label>
          <span id="smartPlugStatus">Ki</span>
        </div>
      `;
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
        
        // Küldés a szerver /login végponthoz (HTTPS, cookie-k továbbítása)
        fetch('https://balintkiss-github-io.onrender.com/login', {  // Cseréld ki a saját szerver URL-edre!
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
          if (data.message === 'Sikeres bejelentkezés') {
            sessionStorage.setItem('admin', 'true');
            renderModalContent(); // Újra rendereljük az admin panelt
          } else {
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
  
  // === Smart Plug Toggle kapcsoló kezelése ===
  function toggleSmartPlug(isOn) {
    document.getElementById('smartPlugStatus').innerText = isOn ? "Be" : "Ki";
    // Példaként küldünk egy POST kérést a szervernek a smart plug váltásához.
    // Cseréld ki az URL-t a saját API végpontodra!
    fetch('https://balintkiss-github-io.onrender.com/api/smartplug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ state: isOn ? "on" : "off" })
    })
    .then(response => response.json())
    .then(data => {
      console.log("Smart plug válasz:", data);
    })
    .catch(error => console.error("Hiba a smart plug váltásakor:", error));
  }
  
  // Zárja a modált, ha a modal-contenton kívülre kattintanak
  window.onclick = function(event) {
    const modal = document.getElementById('adminModal');
    if (event.target === modal) {
      closeAdminModal();
    }
  }
  