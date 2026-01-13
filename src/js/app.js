 
// Weather Forecast Application
// API: OpenWeatherMap + OpenStreetMap (Nominatim)
 

const API_KEY = "70ac342e5a05e0420fa5e454c744acef";

let map;
let marker;
let mapInitialized = false;
let currentTempC = 0;
let isCelsius = true;
 
// ERROR HANDLING
 
function showError(message) {
    document.getElementById("error").innerText = message;
}

function clearError() {
    document.getElementById("error").innerText = "";
}

 
// MAP TOGGLE
 

function toggleMap(force = false) {
    const mapSection = document.getElementById("mapSection");

    if (force || mapSection.classList.contains("hidden")) {
        mapSection.classList.remove("hidden");
        if (!mapInitialized) {
            initMap();
            mapInitialized = true;
        }
    }
}

 
// MAP INITIALIZATION WITH MULTIPLE LAYERS
 

function initMap() {
    const streetLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    );

    const satelliteLayer = L.tileLayer(
        "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        { subdomains: ["mt0", "mt1", "mt2", "mt3"] }
    );

    const terrainLayer = L.tileLayer(
        "https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
        { subdomains: ["mt0", "mt1", "mt2", "mt3"] }
    );

    map = L.map("map", {
        center: [20.5937, 78.9629],
        zoom: 5,
        layers: [streetLayer]
    });

    L.control.layers({
        Street: streetLayer,
        Satellite: satelliteLayer,
        Terrain: terrainLayer
    }).addTo(map);

    map.on("click", onMapClick);
}

 
// MAP MOVE & CLICK
 

function moveMap(lat, lon) {
    toggleMap(true);
    map.setView([lat, lon], 10);

    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lon]).addTo(map);
}

function onMapClick(event) {
    const { lat, lng } = event.latlng;
    moveMap(lat, lng);
    fetchWeatherByCoordinates(lat, lng);
}

 
// SEARCH BY CITY / PINCODE
 

function getWeatherByCity() {
    clearError();
    const input = document.getElementById("cityInput").value.trim();

    if (!input) {
        showError("Please enter city / village / pincode");
        return;
    }

    // Indian pincode detection
    if (/^\d{6}$/.test(input)) {
        fetchByPincode(input);
    } else {
        fetchByCityName(input);
    }
}

 
// FETCH BY CITY NAME
 

function fetchByCityName(place) {
    fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${place}&appid=${API_KEY}&units=metric`
    )
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

 
// FETCH BY PINCODE (NOMINATIM)
 

function fetchByPincode(pincode) {
    fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json`
    )
        .then(res => res.json())
        .then(data => {
            if (!data.length) {
                showError("Invalid pincode");
                return;
            }

            const { lat, lon } = data[0];
            moveMap(lat, lon);
            fetchWeatherByCoordinates(lat, lon);
        });
}

 
// FETCH BY CURRENT LOCATION
 

function getWeatherByLocation() {
    clearError();

    navigator.geolocation.getCurrentPosition(
        position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            moveMap(lat, lon);
            fetchWeatherByCoordinates(lat, lon);
        },
        () => showError("Location permission denied")
    );
}

 
// FETCH WEATHER BY COORDINATES
 

function fetchWeatherByCoordinates(lat, lon) {
    fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    )
        .then(res => res.json())
        .then(data => {
            if (!data.main) {
                showError("Weather data unavailable");
                return;
            }

            displayWeather(data);
            fetchLocationDetails(lat, lon);
            fetchForecast(lat, lon);
        });
}

 
// LOCATION DETAILS (REVERSE GEOCODING)
 

function fetchLocationDetails(lat, lon) {
    fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    )
        .then(res => res.json())
        .then(data => {
            const a = data.address || {};

            const village =
                a.village || a.hamlet || a.town || a.city || "";
            const mandal = a.county || a.subdistrict || "";
            const district = a.state_district || "";
            const state = a.state || "";
            const country = a.country || "";

            document.getElementById("locationFull").innerText =
                `📍 ${village}, ${mandal}, ${district}, ${state}, ${country}`;
        });
}

 
// DISPLAY CURRENT WEATHER
 

function displayWeather(data) {
    document.getElementById("weatherBox").classList.remove("hidden");

    currentTempC = data.main.temp;
    isCelsius = true;

    document.getElementById("temperature").innerText =
        `🌡 Temperature: ${currentTempC} °C`;

    document.getElementById("humidity").innerText =
        `💧 Humidity: ${data.main.humidity}%`;

    document.getElementById("wind").innerText =
        `💨 Wind: ${data.wind.speed} m/s`;

    if (currentTempC > 40) {
        showError("⚠ Extreme heat alert!");
    }
}

 
// TEMPERATURE TOGGLE
 

function toggleTemp() {
    const tempElement = document.getElementById("temperature");

    if (isCelsius) {
        tempElement.innerText =
            `🌡 Temperature: ${((currentTempC * 9) / 5 + 32).toFixed(1)} °F`;
    } else {
        tempElement.innerText =
            `🌡 Temperature: ${currentTempC} °C`;
    }

    isCelsius = !isCelsius;
}

 
// FORECAST COLOR LOGIC
 

function getForecastClass(temp, description) {
    description = description.toLowerCase();

    if (description.includes("rain")) return "forecast-rain";
    if (temp >= 32) return "forecast-hot";
    if (temp >= 26) return "forecast-warm";
    if (temp >= 18) return "forecast-normal";
    return "forecast-cold";
}

// 5-DAY FORECAST
 
function fetchForecast(lat, lon) {
    fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    )
        .then(res => res.json())
        .then(data => {
            const forecastContainer = document.getElementById("forecast");
            forecastContainer.innerHTML = "";

            data.list
                .filter(item => item.dt_txt.includes("12:00:00"))
                .slice(0, 5)
                .forEach(day => {
                    const temp = day.main.temp;
                    const desc = day.weather[0].description;

                    const card = document.createElement("div");
                    card.className = `forecast-card ${getForecastClass(temp, desc)}`;

                    card.innerHTML = `
                        <h4 class="font-bold text-lg mb-2">
                            ${day.dt_txt.split(" ")[0]}
                        </h4>
                        <p>Temp ${temp} °C</p>
                        <p>💧Humidity ${day.main.humidity}%</p>
                        <p>💨Wind ${day.wind.speed} m/s</p>
                        <p class="capitalize">${desc}</p>
                    `;

                    forecastContainer.appendChild(card);
                });
        });
}
