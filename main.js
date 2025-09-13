const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let serverProcess;

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Dev: загружаем localhost
    win.loadURL("http://localhost:3000");
}

// Запускаем сервер Node.js
function startServer() {
    serverProcess = spawn("node", [path.join(__dirname, "server/server.js")], {
        stdio: "inherit"
    });

    serverProcess.on("exit", () => console.log("Server stopped"));
}

app.whenReady().then(() => {
    startServer();
    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        if (serverProcess) serverProcess.kill();
        app.quit();
    }
});
