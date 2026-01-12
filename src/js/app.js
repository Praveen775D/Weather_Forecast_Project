const API_KEY = "70ac342e5a05e0420fa5e454c744acef";
let map, marker;
let mapInitialized = false;
let currentTempC = 0;
let isCelsius = true;

// ---------- ERROR ----------
function showError(msg) {
    document.getElementById("error").innerText = msg;
}
function clearError() {
    document.getElementById("error").innerText = "";
}

// ---------- MAP TOGGLE ----------
function toggleMap(force = false) {
    const section = document.getElementById("mapSection");

    if (force || section.classList.contains("hidden")) {
        section.classList.remove("hidden");
        if (!mapInitialized) {
            initMap();
            mapInitialized = true;
        }
    }
}

// ---------- MAP INIT WITH LAYERS ----------
function initMap() {
    const street = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    );

    const satellite = L.tileLayer(
        "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        { subdomains: ["mt0", "mt1", "mt2", "mt3"] }
    );

    const terrain = L.tileLayer(
        "https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
        { subdomains: ["mt0", "mt1", "mt2", "mt3"] }
    );

    map = L.map("map", {
        center: [20.5937, 78.9629],
        zoom: 5,
        layers: [street]
    });

    L.control.layers({
        "Street": street,
        "Satellite": satellite,
        "Terrain": terrain
    }).addTo(map);

    map.on("click", onMapClick);
}

// ---------- MOVE MAP ----------
function moveMap(lat, lon) {
    toggleMap(true);
    map.setView([lat, lon], 10);

    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lon]).addTo(map);
}

// ---------- MAP CLICK ----------
function onMapClick(e) {
    const { lat, lng } = e.latlng;
    moveMap(lat, lng);
    fetchWeatherByCoordinates(lat, lng);
}

// ---------- MAIN SEARCH (CITY / PINCODE) ----------
function getWeatherByCity() {
    clearError();
    const input = document.getElementById("cityInput").value.trim();

    if (!input) {
        showError("Please enter city / village / pincode");
        return;
    }

    // ✅ PINCODE DETECTION (India – 6 digits)
    if (/^\d{6}$/.test(input)) {
        fetchByPincode(input);
    } else {
        fetchByCityName(input);
    }
}

// ---------- CITY NAME SEARCH ----------
function fetchByCityName(place) {
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${place}&appid=${API_KEY}&units=metric`)
        .then(res => res.json())
        .then(data => {
            if (!data.main) {
                showError("Location not found");
                return;
            }

            const { lat, lon } = data.coord;
            displayWeather(data);
            fetchLocationDetails(lat, lon);
            fetchForecast(lat, lon);
            moveMap(lat, lon);
        });
}

// ---------- PINCODE SEARCH ----------
function fetchByPincode(pincode) {
    fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json`)
        .then(res => res.json())
        .then(data => {
            if (!data.length) {
                showError("Invalid pincode");
                return;
            }

            const lat = data[0].lat;
            const lon = data[0].lon;

            moveMap(lat, lon);
            fetchWeatherByCoordinates(lat, lon);
        });
}

// ---------- CURRENT LOCATION ----------
function getWeatherByLocation() {
    clearError();
    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        moveMap(lat, lon);
        fetchWeatherByCoordinates(lat, lon);
    }, () => showError("Location permission denied"));
}

// ---------- WEATHER BY COORD ----------
function fetchWeatherByCoordinates(lat, lon) {
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
        .then(res => res.json())
        .then(data => {
            if (!data.main) {
                showError("Weather unavailable");
                return;
            }
            displayWeather(data);
            fetchLocationDetails(lat, lon);
            fetchForecast(lat, lon);
        });
}

// ---------- LOCATION DETAILS (VILLAGE → COUNTRY) ----------
function fetchLocationDetails(lat, lon) {
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        .then(res => res.json())
        .then(data => {
            const a = data.address || {};
            const village = a.village || a.hamlet || a.town || a.city || "";
            const mandal = a.county || a.subdistrict || "";
            const district = a.state_district || "";
            const state = a.state || "";
            const country = a.country || "";

            document.getElementById("locationFull").innerText =
                `📍 ${village}, ${mandal}, ${district}, ${state}, ${country}`;
        });
}

// ---------- DISPLAY WEATHER ----------
function displayWeather(data) {
    document.getElementById("weatherBox").classList.remove("hidden");

    currentTempC = data.main.temp;
    isCelsius = true;

    document.getElementById("temperature").innerText =
        `🌡 ${currentTempC} °C`;

    document.getElementById("humidity").innerText =
        `💧 ${data.main.humidity}%`;

    document.getElementById("wind").innerText =
        `🌬 ${data.wind.speed} m/s`;

    if (currentTempC > 40) {
        showError("⚠ Extreme heat alert!");
    }
}

// ---------- TEMP TOGGLE ----------
function toggleTemp() {
    const tempEl = document.getElementById("temperature");
    tempEl.innerText = isCelsius
        ? `🌡 ${((currentTempC * 9 / 5) + 32).toFixed(1)} °F`
        : `🌡 ${currentTempC} °C`;
    isCelsius = !isCelsius;
}

// ---------- FORECAST ----------
function fetchForecast(lat, lon) {
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
        .then(res => res.json())
        .then(data => {
            const forecast = document.getElementById("forecast");
            forecast.innerHTML = "";

            data.list
                .filter(item => item.dt_txt.includes("12:00:00"))
                .slice(0, 5)
                .forEach(day => {
                    const card = document.createElement("div");
                    card.className = "bg-white rounded-xl shadow p-3 text-center";
                    card.innerHTML = `
                        <p class="font-semibold">${day.dt_txt.split(" ")[0]}</p>
                        <p>🌡 ${day.main.temp} °C</p>
                        <p>💧 ${day.main.humidity}%</p>
                        <p>🌬 ${day.wind.speed} m/s</p>
                    `;
                    forecast.appendChild(card);
                });
        });
}
