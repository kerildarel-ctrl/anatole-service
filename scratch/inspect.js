const SUPABASE_URL = "https://oesdxbkzshbhyeznjtzf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lc2R4Ymt6c2hiaHllem5qdHpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY1ODIyMiwiZXhwIjoyMTAzMjM0MjIyfQ.ZlkjEBmUSZxZg3beyIxRyQrehsGv26i5vATLp1mr2GQ";

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`
};

async function run() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/commandes?limit=1`, { headers });
    const data = await res.json();
    console.log("Commandes columns:", Object.keys(data[0] || {}));
    console.log("Sample commande row:", data[0]);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
