const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const { fork } = require("child_process");

let serverProcess = null;

function startServer() {
  try {
    const serverPath = path.join(__dirname, "..", "server.js");
    serverProcess = fork(serverPath, [], {
      cwd: path.join(__dirname, ".."),
      env: { ...process.env, PORT: "3001" }
    });
    console.log("Serveur backend Anatole Service démarré.");
  } catch (err) {
    console.error("Erreur démarrage serveur Anatole Service:", err);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 850,
    title: "ANATOLE SERVICE - Gestion & Pressing",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL("http://localhost:3001");

  Menu.setApplicationMenu(null);
  
  win.on("closed", () => {
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  });
}

app.whenReady().then(() => {
  startServer();
  setTimeout(createWindow, 1500);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
