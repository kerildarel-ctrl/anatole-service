const fs = require("fs");
const path = require("path");

const filePath = "c:\\Users\\User\\Videos\\prestige-pro\\public\\app.js";
const content = fs.readFileSync(filePath, "utf8");
const lines = content.split("\n");

lines.forEach((line, idx) => {
  if (line.includes("dateCreation")) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
