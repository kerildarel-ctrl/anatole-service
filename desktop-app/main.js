const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Prestige Pro",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the Netlify URL directly
  win.loadURL("https://prestige-pro.netlify.app/");

  // Remove default menu bar
  Menu.setApplicationMenu(null);
  
  win.on("closed", () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  createWindow();
  
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
