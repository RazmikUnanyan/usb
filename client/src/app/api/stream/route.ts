import { NextRequest } from "next/server";
import { SerialPort } from "serialport";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            let counter = 0;
            let phase: "low" | "rise" | "high" | "fall" = "low";
            const THRESHOLD = 5;

            let port: SerialPort | null = null;
            let useMock = false;

            try {
                // Попробуем открыть порт (например, COM3 на Windows)
                port = new SerialPort({ path: "COM3", baudRate: 9600 });
            } catch (err) {
                console.error("USB not available, fallback to mock mode:", err);
                useMock = true;
            }

            if (port) {
                // Читаем реальные данные с USB
                port.on("data", (chunk: Buffer) => {
                    const raw = chunk.toString().trim();
                    let value = parseFloat(raw);

                    // Если данные невалидные — fallback на 0
                    if (isNaN(value)) {
                        value = 0;
                    }

                    const packet = JSON.stringify({ counter, value });
                    controller.enqueue(encoder.encode(`data: ${packet}\n\n`));
                    counter++;
                });

                port.on("error", (err) => {
                    console.error("Serial error:", err);
                    useMock = true;
                });
            }

            if (useMock || !port) {
                // Эмуляция (ваша текущая логика фаз)
                const interval = setInterval(() => {
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

                    const packet = JSON.stringify({ counter, value });
                    controller.enqueue(encoder.encode(`data: ${packet}\n\n`));
                    counter++;
                }, 50);

                req.signal.addEventListener("abort", () => {
                    clearInterval(interval);
                    controller.close();
                });
            }

            req.signal.addEventListener("abort", () => {
                if (port && port.isOpen) {
                    port.close();
                }
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
