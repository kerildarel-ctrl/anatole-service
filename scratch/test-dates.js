const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "db.json");
const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

console.log("System Local Time:", new Date().toString());
console.log("System ISO Time:", new Date().toISOString());
console.log("toLocaleDateString('en-CA'):", new Date().toLocaleDateString("en-CA"));

const now = new Date();
const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
console.log("startOfDay:", startOfDay.toString());

const events = [
  ...data.ventes.map((v) => ({ label: "vente", dateStr: v.date, parsedDate: new Date(v.date), montant: v.montant })),
  ...data.commandes.filter((c) => c.statut === "Livré").map((c) => ({ label: "commande", dateStr: c.dateLivraison || c.dateCreation, parsedDate: new Date(c.dateLivraison || c.dateCreation), montant: c.montant })),
];

console.log("\nEvents comparison:");
events.forEach(e => {
  const isIncluded = e.parsedDate >= startOfDay;
  console.log(`${e.label} - dateStr: ${e.dateStr} - parsedDate: ${e.parsedDate.toISOString()} - >= startOfDay: ${isIncluded} - amount: ${e.montant}`);
});

console.log("\nPresence check:");
console.log("Database presenceDate:", data.presenceDate);
const todayStr = new Date().toLocaleDateString("en-CA");
console.log("Current todayStr:", todayStr);
console.log("Need reset?", data.presenceDate !== todayStr);
