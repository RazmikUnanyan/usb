const { app, BrowserWindow } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    if (process.env.NODE_ENV === "development") {
        // 🔹 В режиме разработки
        mainWindow.loadURL("http://localhost:3000");
    } else {
        // 🔹 В продакшне открываем Vercel или локально собранный фронт
        mainWindow.loadURL("https://usb-red.vercel.app/");
        // 👉 Если хотите грузить локально из build:
        // mainWindow.loadFile(path.join(__dirname, "client/out/index.html"));
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

// 🚀 Запуск встроенного Node.js сервера
function startServer() {
    try {
        require(path.join(__dirname, "server", "server.js"));
        console.log("✅ Server started inside Electron");
    } catch (err) {
        console.error("❌ Failed to start server:", err);
    }
}

// 📌 Инициализация приложения
app.whenReady().then(() => {
    startServer();
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// 📌 Закрытие приложения
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
