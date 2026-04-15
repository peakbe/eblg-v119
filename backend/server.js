import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// CORS PRO+
// =========================
app.use(cors({
    origin: "*",
    methods: ["GET"],
    allowedHeaders: ["Content-Type"]
}));

// =========================
// CACHE PRO+ (60 sec)
// =========================
const cache = {
    metar: { ts: 0, data: null },
    taf: { ts: 0, data: null },
    fids: { ts: 0, data: null }
};

function getCache(key, ttl = 60000) {
    const now = Date.now();
    if (cache[key].data && (now - cache[key].ts < ttl)) {
        console.log("[CACHE HIT]", key);
        return cache[key].data;
    }
    return null;
}

function setCache(key, data) {
    cache[key].ts = Date.now();
    cache[key].data = data;
}

// =========================
// FETCH PRO+
// =========================
async function safeFetch(url) {
    try {
        console.log("[FETCH] →", url);

        const res = await fetch(url);
        console.log("[FETCH] STATUS:", res.status);

        const text = await res.text();

        if (!res.ok) {
            console.error("[FETCH ERROR]", text);
            return { fallback: true, status: res.status, body: text };
        }

        try {
            return JSON.parse(text);
        } catch (err) {
            console.error("[FETCH PARSE ERROR]", err);
            return { fallback: true, error: "Invalid JSON", raw: text };
        }

    } catch (err) {
        console.error("[FETCH EXCEPTION]", err);
        return { fallback: true, error: err.message };
    }
}

// =========================
// METAR
// =========================
app.get("/metar", async (req, res) => {
    const cached = getCache("metar");
    if (cached) return res.json(cached);

    const data = await safeFetch(
        `https://api.checkwx.com/metar/EBLG/decoded?x-api-key=${process.env.CHECKWX_KEY}`
    );

    if (data.fallback) {
        const fb = {
            fallback: true,
            data: [{
                raw_text: "METAR unavailable",
                wind: { degrees: 0, speed_kts: 0 }
            }],
            timestamp: new Date().toISOString()
        };
        setCache("metar", fb);
        return res.json(fb);
    }

    setCache("metar", data);
    res.json(data);
});

// =========================
// TAF (corrigé)
// =========================
app.get("/taf", async (req, res) => {
    const cached = getCache("taf");
    if (cached) return res.json(cached);

    const data = await safeFetch(
        `https://api.checkwx.com/taf/EBLG/decoded?x-api-key=${process.env.CHECKWX_KEY}`
    );

    if (data.fallback) {
        const fb = {
            fallback: true,
            data: [{
                raw_text: "TAF unavailable"
            }],
            timestamp: new Date().toISOString()
        };
        setCache("taf", fb);
        return res.json(fb);
    }

    setCache("taf", data);
    res.json(data);
});

// =========================
// FIDS (AviationStack)
// =========================
app.get("/fids", async (req, res) => {
    const cached = getCache("fids");
    if (cached) return res.json(cached);

    const url = `http://api.aviationstack.com/v1/flights?dep_iata=LGG&access_key=${process.env.AVIATIONSTACK_KEY}`;
    const data = await safeFetch(url);

   if (data.fallback || !data.data) {

    const realisticFids = [
        { flight: "QY123", destination: "LEJ", time: "08:45", status: "Departed", fallback: true },
        { flight: "X7182", destination: "TLV", time: "09:10", status: "Boarding", fallback: true },
        { flight: "QR8962", destination: "DOH", time: "09:40", status: "Scheduled", fallback: true },
        { flight: "ET3721", destination: "ADD", time: "10:05", status: "Loading", fallback: true },
        { flight: "TK6543", destination: "IST", time: "10:20", status: "Delayed", fallback: true },
        { flight: "3V450", destination: "CGN", time: "10:45", status: "Departed", fallback: true },
        { flight: "RU927", destination: "SVO", time: "11:00", status: "Scheduled", fallback: true },
        { flight: "K4972", destination: "CVG", time: "11:20", status: "Loading", fallback: true }
    ];

    const fb = realisticFids.map(f => ({
        ...f,
        timestamp: new Date().toISOString()
    }));

    setCache("fids", fb);
    return res.json(fb);
}


    const flights = data.data.slice(0, 10).map(f => ({
        flight: f.flight?.iata || "N/A",
        destination: f.arrival?.iata || "N/A",
        time: f.departure?.scheduled || "N/A",
        status: f.flight_status || "N/A",
        fallback: false
    }));

    setCache("fids", flights);
    res.json(flights);
});

// =========================
// SONOMETERS (restauré)
// =========================
app.get("/sonos", (req, res) => {
    res.json({ ok: true });
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
    console.log("[PROXY] Running on port", PORT);
});
