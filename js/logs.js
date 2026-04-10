import { PROXY } from "./config.js";

const logsPanel = document.getElementById("logs-panel");
const logs = []; // historique rotatif

function addLog(status, message) {
    const entry = {
        status,
        message,
        time: new Date().toLocaleTimeString()
    };

    logs.unshift(entry);
    if (logs.length > 10) logs.pop();

    renderLogs();
}

function renderLogs() {
    logsPanel.innerHTML = logs.map(log => `
        <div class="log-entry log-${log.status}">
            <span class="log-time">${log.time}</span>
            ${log.message}
        </div>
    `).join("");
}

async function testEndpoint(name, endpoint) {
    try {
        const res = await fetch(`${PROXY}/${endpoint}`);
        const json = await res.json();

        if (json.fallback) {
            addLog("warn", `${name} → fallback`);
        } else {
            addLog("ok", `${name} → OK`);
        }

    } catch (err) {
        addLog("error", `${name} → erreur`);
    }
}

export function updateLogs() {
    testEndpoint("METAR", "metar");
    testEndpoint("TAF", "taf");
    testEndpoint("FIDS", "fids");
    testEndpoint("Backend", "sonos");
}

// Mise à jour toutes les 30 secondes
setInterval(updateLogs, 30000);
