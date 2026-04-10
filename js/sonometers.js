import { SONOMETERS } from "./config.js";

let heatLayer = null;

export function createStaticHeatmap(map) {
    // Chaque sonomètre = intensité 1 (uniforme)
    const heatPoints = SONOMETERS.map(s => [s.lat, s.lon, 1]);

    heatLayer = L.heatLayer(heatPoints, {
        radius: 35,
        blur: 20,
        maxZoom: 12,
        minOpacity: 0.4,
        gradient: {
            0.2: "#00bcd4",
            0.4: "#4caf50",
            0.6: "#ffeb3b",
            0.8: "#ff9800",
            1.0: "#f44336"
        }
    });

    return heatLayer;
}

export function toggleHeatmap(map) {
    if (!heatLayer) {
        createStaticHeatmap(map);
    }

    if (map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer);
    } else {
        heatLayer.addTo(map);
    }
}


const sonoList = document.getElementById("sono-list");
const detailPanel = document.getElementById("detail-panel");
const detailTitle = document.getElementById("detail-title");
const detailAddress = document.getElementById("detail-address");
const detailTown = document.getElementById("detail-town");
const detailStatus = document.getElementById("detail-status");
const detailDistance = document.getElementById("detail-distance");

let mapRef = null;

// Appelé depuis initMap()
export function initSonometers(map) {
    mapRef = map;

    renderSonoList();
    renderSonoMarkers();
}

// ============================
// 1) Sidebar list
// ============================

function renderSonoList() {
    sonoList.innerHTML = SONOMETERS.map(s => `
        <div class="sono-item" data-id="${s.id}">
            <b>${s.id}</b><br>
            <span>${s.address}</span>
        </div>
    `).join("");

    document.querySelectorAll(".sono-item").forEach(item => {
        item.addEventListener("click", () => {
            const id = item.getAttribute("data-id");
            const s = SONOMETERS.find(x => x.id === id);
            if (s) showDetail(s);
        });
    });
}

// ============================
// 2) Markers sur la carte
// ============================

function renderSonoMarkers() {
    SONOMETERS.forEach(s => {
        const marker = L.marker([s.lat, s.lon]).addTo(mapRef);

        marker.bindPopup(`
            <b>${s.id}</b><br>
            ${s.address}
        `);

        marker.on("click", () => showDetail(s));
    });
}

// ============================
// 3) Panneau détail
// ============================

function showDetail(s) {
    detailTitle.textContent = s.id;
    detailAddress.textContent = s.address;

    // Extraction commune (simple split)
    detailTown.textContent = s.address.split(",").pop().trim();

    detailStatus.textContent = "Actif";

    // Distance piste (EBLG 05 threshold)
    const runway05 = { lat: 50.6375, lon: 5.4431 };

    const d = haversine(s.lat, s.lon, runway05.lat, runway05.lon);
    detailDistance.textContent = d.toFixed(2) + " km";

    detailPanel.classList.remove("hidden");
}

// ============================
// 4) Haversine (distance km)
// ============================

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI/180;
    const dLon = (lon2 - lon1) * Math.PI/180;

    const a =
        Math.sin(dLat/2)**2 +
        Math.cos(lat1*Math.PI/180) *
        Math.cos(lat2*Math.PI/180) *
        Math.sin(dLon/2)**2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
