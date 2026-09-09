const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "db.json");
if (!fs.existsSync(dbPath)) {
  console.log("Database file not found at:", dbPath);
  process.exit(1);
}

try {
  const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  
  // Keep employees
  const employes = data.employes || [];
  
  // Keep presence date
  const presenceDate = data.presenceDate || "";
  
  // Reset other tables
  const resetData = {
    clients: [],
    devis: [],
    commandes: [],
    stock: [],
    mouvements: [],
    ventes: [],
    finance: [],
    notifications: [],
    employes: employes,
    presenceDate: presenceDate
  };
  
  fs.writeFileSync(dbPath, JSON.stringify(resetData, null, 2), "utf-8");
  console.log("Database successfully reset! Kept", employes.length, "employee accounts.");
} catch (e) {
  console.error("Error resetting database:", e);
  process.exit(1);
}
