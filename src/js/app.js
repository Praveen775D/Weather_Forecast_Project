const API_KEY = "YOUR_API_KEY_HERE";
let isCelsius = true;
let currentTempC = 0;

function showError(msg) {
    document.getElementById("error").innerText = msg;
}

function clearError() {
    document.getElementById("error").innerText = "";
}

function getWeatherByCity() {
    const city = document.getElementById("cityInput").value.trim();
    if (!city) {
        showError("Please enter a city name");
        return;
    }
    clearError();
    fetchWeather(`q=${city}`);
}

function getWeatherByLocation() {
    if (!navigator.geolocation) {
        showError("Geolocation not supported");
        return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude } = pos.coords;
        fetchWeather(`lat=${latitude}&lon=${longitude}`);
    }, () => showError("Location access denied"));
}

function fetchWeather(query) {
    fetch(`https://api.openweathermap.org/data/2.5/weather?${query}&appid=${API_KEY}&units=metric`)
        .then(res => res.json())
        .then(data => {
            if (data.cod !== 200) {
                showError(data.message);
                return;
            }
            displayWeather(data);
            fetchForecast(data.coord.lat, data.coord.lon);
        })
        .catch(() => showError("Failed to fetch weather data"));
}

function displayWeather(data) {
    const result = document.getElementById("weatherResult");
    result.classList.remove("hidden");

    currentTempC = data.main.temp;

    document.getElementById("locationName").innerText =
        `${data.name}, ${data.sys.country}`;
    document.getElementById("temperature").innerText =
        `Temperature: ${currentTempC} °C`;
    document.getElementById("humidity").innerText =
        `Humidity: ${data.main.humidity}%`;
    document.getElementById("wind").innerText =
        `Wind Speed: ${data.wind.speed} m/s`;

    if (currentTempC > 40) {
        alert("⚠ Extreme Heat Alert!");
    }
}

function toggleTemp() {
    const tempEl = document.getElementById("temperature");
    if (isCelsius) {
        const f = (currentTempC * 9/5) + 32;
        tempEl.innerText = `Temperature: ${f.toFixed(1)} °F`;
    } else {
        tempEl.innerText = `Temperature: ${currentTempC} °C`;
    }
    isCelsius = !isCelsius;
}

function fetchForecast(lat, lon) {
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
        .then(res => res.json())
        .then(data => displayForecast(data.list))
        .catch(() => showError("Failed to fetch forecast"));
}

function displayForecast(list) {
    const forecastDiv = document.getElementById("forecast");
    forecastDiv.innerHTML = "";
    const daily = list.filter(item => item.dt_txt.includes("12:00:00"));

    daily.slice(0,5).forEach(day => {
        const card = document.createElement("div");
        card.className = "bg-white p-3 rounded shadow text-center";

        card.innerHTML = `
            <p class="font-semibold">${day.dt_txt.split(" ")[0]}</p>
            <p>🌡 ${day.main.temp} °C</p>
            <p>💧 ${day.main.humidity}%</p>
            <p>🌬 ${day.wind.speed} m/s</p>
        `;
        forecastDiv.appendChild(card);
    });
}
