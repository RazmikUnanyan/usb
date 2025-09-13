const express = require("express");
const { SerialPort } = require("serialport");

const app = express();
const PORT = 4000;
const THRESHOLD = 5;

let phase = "low";
let counter = 0;

// Изначально считаем, что порт недоступен
let port;
let useMock = true;

try {
    port = new SerialPort({ path: "COM3", baudRate: 9600 });
    port.on("open", () => {
        console.log("USB connected on COM3");
        useMock = false;
    });
    port.on("error", (err) => {
        console.warn("USB error, switching to mock mode:", err.message);
        useMock = true;
    });
} catch (err) {
    console.warn("USB not available, switching to mock mode:", err.message);
    useMock = true;
}


// SSE endpoint
app.get("/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "https://usb-8dfb.vercel.app/");

    const sendPacket = (value) => {
        const packet = JSON.stringify({ counter, value });
        res.write(`data: ${packet}\n\n`);
        counter++;
    };

    let interval;

    if (useMock || !port) {
        // Mock mode
        interval = setInterval(() => {
            let value = 0;

            if (phase === "low") {
                value = Math.random() * 0.5;
                if (counter > 40) phase = "rise";
            } else if (phase === "rise") {
                value = Math.min(10, value + Math.random() * 1.5);
                if (value >= THRESHOLD + 2) phase = "high";
            } else if (phase === "high") {
                value = THRESHOLD + 2 + Math.random();
                if (counter > 80) phase = "fall";
            } else if (phase === "fall") {
                value = Math.max(0, value - Math.random() * 1.5);
                if (value <= 0.5) {
                    phase = "low";
                    counter = 0;
                }
            }

            sendPacket(value);
        }, 50);
    } else {
        // Real USB mode
        port.on("data", (chunk) => {
            const raw = chunk.toString().trim();
            let value = parseFloat(raw);
            if (isNaN(value)) value = 0;
            sendPacket(value);
        });
    }

    req.on("close", () => {
        if (interval) clearInterval(interval);
    });
});

app.listen(PORT, () => {
    console.log(`Node.js serial service running on http://localhost:${PORT}/stream`);
});
