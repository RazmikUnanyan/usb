const express = require("express");
const cors = require("cors");
const { SerialPort } = require("serialport");

const app = express();
const PORT = 4000;

// Разрешаем CORS для фронтенда
app.use(cors({
    origin: "https://usb-red.vercel.app",
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

let phase = "low";
let counter = 0;

// SSE endpoint
app.get("/stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendPacket = (value) => {
        const packet = JSON.stringify([value]);
        res.write(`data: ${packet}\n\n`);
        counter++;
    };

    let interval;
    let port;

    try {
        // Проверим список портов
        const ports = await SerialPort.list();
        const com3 = ports.find(p => p.path.includes("COM3"));

        if (!com3) throw new Error("COM3 not found");

        // Открываем порт
        port = new SerialPort({ path: "COM3", baudRate: 9600 });

        port.on("open", () => {
            console.log("USB connected on COM3");
        });

        port.on("data", (chunk) => {
            const raw = chunk.toString().trim();
            let value = parseFloat(raw);
            if (isNaN(value)) value = 0;
            sendPacket(value);
        });

        port.on("error", (err) => {
            console.warn("USB error:", err.message);
        });

    } catch (err) {
        console.warn("USB not available, switching to mock mode:", err.message);

        // Мокаем поток
        interval = setInterval(() => {
            let value = 0;

            switch (phase) {
                case "low":
                    value = Math.floor(Math.random() * 2); // 0 или 1
                    if (counter > 40) phase = "rise";
                    break;

                case "rise":
                    value = Math.floor(Math.random() * 4 + 6); // 6..9
                    phase = "high";
                    counter = 0;
                    break;

                case "high":
                    value = Math.floor(Math.random() * 3 + 7); // 7..9
                    if (counter > 50) phase = "fall";
                    break;

                case "fall":
                    value = Math.floor(Math.random() * 5); // 0..4
                    if (value <= 1) {
                        phase = "low";
                        counter = 0;
                    }
                    break;
            }

            sendPacket(value);
            counter++;
        }, 100);
    }

    req.on("close", () => {
        if (interval) clearInterval(interval);
        if (port) port.close(() => console.log("COM3 closed"));
    });
});

app.listen(PORT, () => {
    console.log(`Node.js serial service running on http://localhost:${PORT}/stream`);
});
