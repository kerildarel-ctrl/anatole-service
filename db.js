const SUPABASE_URL = process.env.SUPABASE_URL || "https://ilkddunmekguqqawgcxh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsa2RkdW5tZWtndXFxYXdnY3hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk2MDM3MywiZXhwIjoyMTA0NTM2MzczfQ.NLOHYFRFVtJ4YZOJQjiWmlW2GFkUjn8YHEWtdACzxYQ";

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`
};

function normalizeRow(row) {
  if (!row) return row;
  const normalized = { ...row };
  // Employes mapping
  if (row.estadmin !== undefined && row.estAdmin === undefined) normalized.estAdmin = row.estadmin;
  if (row.passwordhash !== undefined && row.passwordHash === undefined) normalized.passwordHash = row.passwordhash;
  if (row.password !== undefined && row.passwordHash === undefined) normalized.passwordHash = row.password;

  // General casing mapping
  if (row.clientid !== undefined && row.clientId === undefined) normalized.clientId = row.clientid;
  if (row.montantpaye !== undefined && row.montantPaye === undefined) normalized.montantPaye = row.montantpaye;
  if (row.datecreation !== undefined && row.dateCreation === undefined) normalized.dateCreation = row.datecreation;
  if (row.datelivraison !== undefined && row.dateLivraison === undefined) normalized.dateLivraison = row.datelivraison;
  if (row.montanttotal !== undefined && row.montantTotal === undefined) normalized.montantTotal = row.montanttotal;
  if (row.creele !== undefined && row.creeLe === undefined) normalized.creeLe = row.creele;
  if (row.prixachat !== undefined && row.prixAchat === undefined) normalized.prixAchat = row.prixachat;
  if (row.prixvente !== undefined && row.prixVente === undefined) normalized.prixVente = row.prixvente;
  if (row.articleid !== undefined && row.articleId === undefined) normalized.articleId = row.articleid;
  if (row.modepaiement !== undefined && row.modePaiement === undefined) normalized.modePaiement = row.modepaiement;
  return normalized;
}

// Generic read operations
async function fetchTable(table) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers });
    if (!res.ok) {
      console.warn(`Supabase warning: could not fetch table "${table}" (status ${res.status}).`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data.map(normalizeRow) : [];
  } catch (err) {
    console.error(`Supabase connection error on table "${table}":`, err);
    return [];
  }
}

async function getRow(table, id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}&select=*`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.length > 0 ? normalizeRow(data[0]) : null;
  } catch (err) {
    console.error(`Error fetching row from "${table}" with ID "${id}":`, err);
    return null;
  }
}

// Special custom queries for security / checks
async function getEmployeByIdentifiant(identifiant) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/employes?identifiant=eq.${identifiant}&select=*`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.length > 0 ? normalizeRow(data[0]) : null;
  } catch (err) {
    console.error("Error fetching employee by identifier:", err);
    return null;
  }
}

async function countOtherAdmins(excludeId) {
  try {
    const employes = await fetchTable("employes");
    return employes.filter(e => e.id !== excludeId && (e.estAdmin === true || e.estadmin === true || e.estAdmin === "true")).length;
  } catch (err) {
    console.error("Error counting other admins:", err);
    return 0;
  }
}

function handleMissingColumn(sanitized, missingCol) {
  if (sanitized[missingCol] === undefined) return false;
  const lower = missingCol.toLowerCase();
  if (lower !== missingCol) {
    console.warn(`Column '${missingCol}' not found in Supabase schema. Converting to lowercase key '${lower}'...`);
    sanitized[lower] = sanitized[missingCol];
    delete sanitized[missingCol];
    return true;
  }
  console.warn(`Column '${missingCol}' does not exist in table schema. Stripping...`);
  delete sanitized[missingCol];
  return true;
}

// Generic write operations with self-healing schema retry
async function insertRow(table, row) {
  let sanitized = { ...row };
  if (table === "employes") {
    if (sanitized.estAdmin !== undefined) {
      sanitized.estAdmin = !!sanitized.estAdmin;
      sanitized.estadmin = sanitized.estAdmin;
    }
    if (sanitized.passwordHash !== undefined) {
      sanitized.passwordHash = sanitized.passwordHash;
      sanitized.passwordhash = sanitized.passwordHash;
      sanitized.password = sanitized.passwordHash;
    }
    sanitized.actif = !!(sanitized.actif !== undefined ? sanitized.actif : true);
  } else if (table === "notifications") {
    sanitized.lu = !!row.lu;
  }

  let attempts = 0;
  while (attempts < 10) {
    attempts++;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(sanitized)
    });

    if (res.ok) return;

    const errText = await res.text();
    // Check if error is PGRST204 (column not found)
    const match = errText.match(/Could not find the '([^']+)' column/i);
    if (match && match[1]) {
      const handled = handleMissingColumn(sanitized, match[1]);
      if (handled) continue;
    }

    console.error(`Error inserting row into "${table}":`, errText);
    throw new Error(`Failed to insert into "${table}": ${errText}`);
  }
}

async function updateRow(table, id, fields) {
  let sanitized = { ...fields };
  if (table === "employes") {
    if (sanitized.estAdmin !== undefined) {
      sanitized.estAdmin = !!sanitized.estAdmin;
      sanitized.estadmin = sanitized.estAdmin;
    }
    if (sanitized.passwordHash !== undefined) {
      sanitized.passwordHash = sanitized.passwordHash;
      sanitized.passwordhash = sanitized.passwordHash;
      sanitized.password = sanitized.passwordHash;
    }
    if (sanitized.actif !== undefined) {
      sanitized.actif = !!sanitized.actif;
    }
  } else if (table === "notifications") {
    if (fields.lu !== undefined) sanitized.lu = !!fields.lu;
  }

  let attempts = 0;
  while (attempts < 10) {
    attempts++;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(sanitized)
    });

    if (res.ok) return;

    const errText = await res.text();
    const match = errText.match(/Could not find the '([^']+)' column/i);
    if (match && match[1]) {
      const handled = handleMissingColumn(sanitized, match[1]);
      if (handled) continue;
    }

    console.error(`Error updating row in "${table}" with ID "${id}":`, errText);
    throw new Error(`Failed to update "${table}": ${errText}`);
  }
}

async function deleteRow(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Error deleting row from "${table}" with ID "${id}":`, errText);
    throw new Error(`Failed to delete from "${table}": ${errText}`);
  }
}

// Global Operations (Setup, Boot and Reset)
async function getData() {
  const [
    clients,
    devis,
    commandes,
    stock,
    mouvements,
    ventes,
    finance,
    employes,
    notifications
  ] = await Promise.all([
    fetchTable("clients"),
    fetchTable("devis"),
    fetchTable("commandes"),
    fetchTable("stock"),
    fetchTable("mouvements"),
    fetchTable("ventes"),
    fetchTable("finance"),
    fetchTable("employes"),
    fetchTable("notifications")
  ]);

  return {
    clients: (clients || []).map(normalizeRow),
    devis: (devis || []).map(normalizeRow),
    commandes: (commandes || []).map(normalizeRow),
    stock: (stock || []).map(normalizeRow),
    mouvements: (mouvements || []).map(normalizeRow),
    ventes: (ventes || []).map(normalizeRow),
    finance: (finance || []).map(normalizeRow),
    employes: (employes || []).map(e => {
      const norm = normalizeRow(e);
      return {
        ...norm,
        estAdmin: norm.estAdmin === true || norm.estAdmin === 1 || norm.estAdmin === "true" || norm.estadmin === true,
        actif: norm.actif === true || norm.actif === 1 || norm.actif === "true"
      };
    }),
    notifications: (notifications || []).map(n => {
      const norm = normalizeRow(n);
      return {
        ...norm,
        lu: norm.lu === true || norm.lu === 1 || norm.lu === "true"
      };
    })
  };
}

async function resetDatabase() {
  const tables = ["clients", "devis", "commandes", "stock", "mouvements", "ventes", "finance", "notifications"];
  await Promise.all(
    tables.map(table => fetch(`${SUPABASE_URL}/rest/v1/${table}?id=not.is.null`, { method: "DELETE", headers }))
  );
}

module.exports = {
  getData,
  getRow,
  insertRow,
  updateRow,
  deleteRow,
  getEmployeByIdentifiant,
  countOtherAdmins,
  resetDatabase
};
