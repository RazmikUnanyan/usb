const express = require("express");
const cors = require("cors");
const { SerialPort } = require("serialport");

const app = express();
const PORT = 4000;
const THRESHOLD = 5;

let phase = "low";
let counter = 0;

// Разрешаем CORS для фронтенда
app.use(cors({
    origin: "https://usb-red.vercel.app",
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

// Изначально считаем, что порт недоступен
let port;
let useMock = true;

try {
    port = new SerialPort({ path: "COM", baudRate: 9600 });
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

    const sendPacket = (value) => {
        const packet = JSON.stringify([value]);
        res.write(`data: ${packet}\n\n`);
        counter++;
    };

    let interval;

    if (useMock || !port) {
        // Mock mode
        interval = setInterval(() => {
            let value = 0;

            switch (phase) {
                case "low":
                    // Низкая фаза: значения около 0
                    value = Math.floor(Math.random() * 2); // 0 или 1
                    if (counter > 40) phase = "rise";
                    break;

                case "rise":
                    // Резкий скачок вверх
                    value = Math.floor(Math.random() * 4 + 6); // 6..9
                    phase = "high";
                    counter = 0; // сбрасываем счетчик для high
                    break;

                case "high":
                    // Удерживаем высокое значение
                    value = Math.floor(Math.random() * 3 + 7); // 7..9
                    if (counter > 50) phase = "fall"; // держим high некоторое время
                    break;

                case "fall":
                    // Падение обратно к нулю
                    value = Math.floor(Math.random() * 5); // 0..4
                    if (value <= 1) {
                        phase = "low";
                        counter = 0;
                    }
                    break;
            }

            sendPacket(value);
            counter++;
        }, 100)
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
