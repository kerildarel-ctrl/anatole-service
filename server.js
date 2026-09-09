const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { 
  getData, 
  getRow, 
  insertRow, 
  updateRow, 
  deleteRow, 
  getEmployeByIdentifiant, 
  countOtherAdmins, 
  resetDatabase 
} = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------- Session secret (persisted) --------------------- */
const SECRET_PATH = path.join(__dirname, "data", "session-secret.txt");
function getSecret() {
  try {
    return fs.readFileSync(SECRET_PATH, "utf-8").trim();
  } catch (e) {
    const secret = crypto.randomBytes(32).toString("hex");
    fs.mkdirSync(path.dirname(SECRET_PATH), { recursive: true });
    fs.writeFileSync(SECRET_PATH, secret, "utf-8");
    return secret;
  }
}

const COOKIE_NAME = "prestige_session";

function signSession(userId) {
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(userId);
  const sig = hmac.digest("hex");
  return `${userId}.${sig}`;
}

function verifySession(cookieValue) {
  if (!cookieValue) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  const [userId, sig] = parts;
  try {
    const hmac = crypto.createHmac("sha256", getSecret());
    hmac.update(userId);
    const expectedSig = hmac.digest("hex");
    if (crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) {
      return userId;
    }
  } catch (e) {}
  return null;
}

app.use(express.json());

// Custom stateless session cookie parser
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie || "";
  const cookies = {};
  cookieHeader.split(";").forEach(c => {
    const parts = c.split("=");
    if (parts.length === 2) {
      cookies[parts[0].trim()] = parts[1].trim();
    }
  });

  const rawSession = cookies[COOKIE_NAME];
  const userId = verifySession(rawSession);
  req.session = {
    userId,
    destroy(callback) {
      res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`);
      req.session.userId = null;
      if (callback) callback();
    }
  };
  next();
});

app.use(express.static(path.join(__dirname, "public")));

const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/* ---------------- Password helpers --------------------- */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, passwordHash: hash, storedPassword: `${salt}:${hash}` };
}
function verifyPassword(password, salt, passwordHash, storedPassword) {
  let s = salt;
  let h = passwordHash;
  if ((!s || !h) && storedPassword && storedPassword.includes(":")) {
    const parts = storedPassword.split(":");
    if (parts.length === 2) {
      s = parts[0];
      h = parts[1];
    }
  }
  if (!s || !h) {
    if (storedPassword && storedPassword === password) return true;
    return false;
  }
  try {
    const computed = crypto.scryptSync(password, s, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(h, "hex"));
  } catch (e) {
    return false;
  }
}
function sanitizeEmploye(e) {
  if (!e) return null;
  const { salt, passwordHash, passwordhash, password, ...rest } = e;
  return rest;
}

/* ---------------- Middlewares ---------------- */
async function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "non connecté" });
  next();
}

async function requireAdmin(req, res, next) {
  try {
    if (!req.session.userId) return res.status(401).json({ error: "non connecté" });
    const employe = await getRow("employes", req.session.userId);
    if (!employe || !employe.estAdmin) return res.status(403).json({ error: "réservé à l'administrateur" });
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function addNotification(text) {
  try {
    const notif = {
      id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4),
      text,
      date: new Date().toISOString(),
      lu: false
    };
    await insertRow("notifications", notif);
  } catch (err) {
    console.error("Error adding notification:", err);
  }
}

function getLocalTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

app.use("/api", async (req, res, next) => {
  const publicPaths = ["/setup-status", "/setup", "/login", "/logout", "/me"];
  if (publicPaths.includes(req.path)) return next();
  return requireAuth(req, res, next);
});

/* ---------------- /api/me ---------------- */
app.get("/api/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "non connecté" });
  try {
    const employe = await getRow("employes", req.session.userId);
    if (!employe) return res.status(401).json({ error: "non connecté" });
    res.json(sanitizeEmploye(employe));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- /api/setup-status ---------------- */
app.get("/api/setup-status", async (req, res) => {
  try {
    const data = await getData();
    const hasAdmin = data.employes.some((e) => e.estAdmin);
    res.json({ hasAdmin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- /api/setup (first boot) ---------------- */
app.post("/api/setup", async (req, res) => {
  try {
    const data = await getData();
    const hasAdmin = data.employes.some((e) => e.estAdmin);
    if (hasAdmin) return res.status(400).json({ error: "le compte administrateur a déjà été créé" });

    const { nom, identifiant, password } = req.body;
    if (!nom || !identifiant || !password) return res.status(400).json({ error: "champs requis manquants" });
    if (password.length < 4) return res.status(400).json({ error: "mot de passe trop court" });

    const { salt, passwordHash, storedPassword } = hashPassword(password);
    const admin = {
      id: genId(),
      nom,
      role: "Administrateur",
      identifiant,
      password: storedPassword,
      salt,
      passwordHash,
      estAdmin: true,
      actif: true,
    };
    await insertRow("employes", admin);

    req.session.userId = admin.id;
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${signSession(admin.id)}; Path=/; HttpOnly; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`);
    res.json(sanitizeEmploye(admin));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- /api/login ---------------- */
app.post("/api/login", async (req, res) => {
  const { identifiant, password } = req.body;
  if (!identifiant || !password) return res.status(400).json({ error: "identifiant et mot de passe requis" });

  try {
    const employe = await getEmployeByIdentifiant(identifiant);
    if (!employe || !employe.actif) return res.status(401).json({ error: "identifiant ou mot de passe incorrect" });

    const targetHash = employe.passwordHash || employe.passwordhash;
    const targetSalt = employe.salt;
    const targetPassword = employe.password;

    const ok = verifyPassword(password, targetSalt, targetHash, targetPassword);
    if (!ok) return res.status(401).json({ error: "identifiant ou mot de passe incorrect" });

    req.session.userId = employe.id;
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${signSession(employe.id)}; Path=/; HttpOnly; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`);
    res.json(sanitizeEmploye(employe));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- /api/logout ---------------- */
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

/* ---------------- /api/all (sanitized) ---------------- */
app.get("/api/all", async (req, res) => {
  try {
    const data = await getData();
    res.json({ ...data, employes: data.employes.map(sanitizeEmploye), version: "1.1.1" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Employés: custom routes ---------------- */
app.post("/api/employes", requireAdmin, async (req, res) => {
  try {
    const { nom, role, identifiant, password, estAdmin } = req.body;
    if (!nom) return res.status(400).json({ error: "nom requis" });
    if (identifiant) {
      const dup = await getEmployeByIdentifiant(identifiant);
      if (dup) return res.status(400).json({ error: "cet identifiant existe déjà" });
    }
    const employe = { id: genId(), nom, role: role !== undefined ? role : "", actif: true };
    if (identifiant && password) {
      if (password.length < 4) return res.status(400).json({ error: "mot de passe trop court (4 caractères min.)" });
      const { salt, passwordHash } = hashPassword(password);
      Object.assign(employe, { identifiant, salt, passwordHash, estAdmin: !!estAdmin });
    }
    await insertRow("employes", employe);
    res.json(sanitizeEmploye(employe));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/employes/:id", requireAdmin, async (req, res) => {
  try {
    const existing = await getRow("employes", req.params.id);
    if (!existing) return res.status(404).json({ error: "introuvable" });
    const { nom, role, identifiant, password, estAdmin, actif } = req.body;

    if (identifiant) {
      const dup = await getEmployeByIdentifiant(identifiant);
      if (dup && dup.id !== existing.id) {
        return res.status(400).json({ error: "cet identifiant existe déjà" });
      }
    }

    const updated = {};
    if (nom !== undefined) updated.nom = nom;
    if (role !== undefined) updated.role = role;
    if (actif !== undefined) updated.actif = actif;
    if (estAdmin !== undefined) updated.estAdmin = estAdmin;
    if (identifiant !== undefined) updated.identifiant = identifiant;
    if (password) {
      if (password.length < 4) return res.status(400).json({ error: "mot de passe trop court (4 caractères min.)" });
      const { salt, passwordHash } = hashPassword(password);
      updated.salt = salt;
      updated.passwordHash = passwordHash;
    }

    await updateRow("employes", req.params.id, updated);
    res.json(sanitizeEmploye({ ...existing, ...updated }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/employes/:id", requireAdmin, async (req, res) => {
  try {
    const target = await getRow("employes", req.params.id);
    if (!target) return res.status(404).json({ error: "introuvable" });
    if (target.estAdmin) {
      const otherAdmins = await countOtherAdmins(target.id);
      if (otherAdmins === 0) return res.status(400).json({ error: "impossible de supprimer le dernier compte administrateur" });
    }
    await deleteRow("employes", req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notifications/read-all", async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || "https://ilkddunmekguqqawgcxh.supabase.co";
    const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsa2RkdW5tZWtndXFxYXdnY3hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk2MDM3MywiZXhwIjoyMTA0NTM2MzczfQ.NLOHYFRFVtJ4YZOJQjiWmlW2GFkUjn8YHEWtdACzxYQ";
    
    const resSupa = await fetch(`${supabaseUrl}/rest/v1/notifications?lu=eq.false`, {
      method: "PATCH",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ lu: true })
    });
    if (!resSupa.ok) throw new Error(await resSupa.text());
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Everything else: generic CRUD ---------------- */
const COLLECTIONS = ["clients", "devis", "commandes", "stock", "mouvements", "ventes", "finance"];

COLLECTIONS.forEach((col) => {
  app.post(`/api/${col}`, async (req, res) => {
    try {
      const employe = await getRow("employes", req.session.userId);
      const isCaisseOrAdmin = employe && (employe.estAdmin || employe.role === "Caisse");

      if ((col === "ventes" || col === "finance") && !isCaisseOrAdmin) {
        return res.status(403).json({ error: "accès interdit : réservé aux comptes Caisse ou Administrateur" });
      }
      if (col === "commandes" && !isCaisseOrAdmin) {
        if (req.body.statut === "Payée") {
          return res.status(403).json({ error: "seul un compte Caisse ou Administrateur peut créer une commande payée" });
        }
        if (req.body.montantPaye > 0) {
          return res.status(403).json({ error: "seul un compte Caisse ou Administrateur peut enregistrer un paiement" });
        }
      }

      let itemId = req.body.id || genId();
      if (req.body.id) {
        const existing = await getRow(col, req.body.id);
        if (existing) {
          itemId = genId();
        }
      }
      const item = { ...req.body, id: itemId };
      if (col === "commandes" && item.statut === "Payée") {
        item.montantPaye = item.montant;
        await insertRow("finance", {
          id: genId(),
          type: "Recette",
          description: `Paiement commande : ${item.designation || "Sans nom"}`,
          montant: Number(item.montant) || 0,
          date: getLocalTodayISO()
        });
      }
      
      await insertRow(col, item);

      if (col === "devis") {
        await addNotification(`Nouveau devis créé : "${item.designation || "Sans nom"}"`);
      } else if (col === "commandes") {
        await addNotification(`Nouvelle commande enregistrée : "${item.designation || "Sans nom"}"`);
      } else if (col === "ventes") {
        await addNotification(`Nouvelle vente directe : "${item.description || "Sans nom"}" (${item.montant || 0} FCFA)`);
      } else if (col === "finance") {
        await addNotification(`Nouvelle écriture financière (${item.type}) : "${item.description || "Sans nom"}" (${item.montant || 0} FCFA)`);
      }

      res.json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put(`/api/${col}/:id`, async (req, res) => {
    try {
      const employe = await getRow("employes", req.session.userId);
      const isCaisseOrAdmin = employe && (employe.estAdmin || employe.role === "Caisse");

      if ((col === "ventes" || col === "finance") && !isCaisseOrAdmin) {
        return res.status(403).json({ error: "accès interdit : réservé aux comptes Caisse ou Administrateur" });
      }

      const oldItem = await getRow(col, req.params.id);
      if (!oldItem) return res.status(404).json({ error: "introuvable" });

      if (col === "commandes") {
        if (!isCaisseOrAdmin) {
          if (req.body.statut === "Payée") {
            return res.status(403).json({ error: "seul un compte Caisse ou Administrateur peut marquer une commande comme payée" });
          }
          if (req.body.montantPaye !== undefined && req.body.montantPaye !== oldItem.montantPaye) {
            return res.status(403).json({ error: "seul un compte Caisse ou Administrateur peut modifier le montant payé" });
          }
        }
        
        // Block core modifications after 2 hours
        const isCoreModified = (req.body.designation !== undefined && req.body.designation !== oldItem.designation) ||
                               (req.body.montant !== undefined && Number(req.body.montant) !== Number(oldItem.montant));
        if (isCoreModified && oldItem.dateCreation && oldItem.dateCreation.length > 10) {
          const createdTime = new Date(oldItem.dateCreation).getTime();
          const currentTime = new Date().getTime();
          const diffHours = (currentTime - createdTime) / (1000 * 60 * 60);
          if (diffHours > 2) {
            return res.status(400).json({ error: "La commande ne peut plus être modifiée (limite de 2 heures dépassée)." });
          }
        }
      }

      const merged = { ...req.body };
      if (col === "commandes" && merged.statut === "Payée") {
        merged.montantPaye = merged.montant || oldItem.montant;
      }
      
      await updateRow(col, req.params.id, merged);

      if (oldItem) {
        if (col === "commandes" && req.body.statut && oldItem.statut !== req.body.statut) {
          await addNotification(`Commande "${oldItem.designation}" passée en statut : ${req.body.statut}`);
          if (req.body.statut === "Payée" && oldItem.statut !== "Payée") {
            await insertRow("finance", {
              id: genId(),
              type: "Recette",
              description: `Paiement commande : ${oldItem.designation || "Sans nom"}`,
              montant: Number(req.body.montant || oldItem.montant) || 0,
              date: getLocalTodayISO()
            });
          }
        } else if (col === "stock" && req.body.quantite !== undefined) {
          const newQty = Number(req.body.quantite);
          const threshold = Number(oldItem.seuil);
          if (newQty <= threshold && Number(oldItem.quantite) > threshold) {
            await addNotification(`Alerte Stock : L'article "${oldItem.nom}" est au niveau critique (${newQty} restants)`);
          }
        }
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete(`/api/${col}/:id`, async (req, res) => {
    try {
      const employe = await getRow("employes", req.session.userId);
      const isCaisseOrAdmin = employe && (employe.estAdmin || employe.role === "Caisse");

      if ((col === "ventes" || col === "finance") && !isCaisseOrAdmin) {
        return res.status(403).json({ error: "accès interdit : réservé aux comptes Caisse ou Administrateur" });
      }

      if (col === "commandes") {
        const oldItem = await getRow("commandes", req.params.id);
        if (oldItem && oldItem.statut === "Payée") {
          return res.status(400).json({ error: "Impossible de supprimer une commande déjà payée." });
        }
      }

      await deleteRow(col, req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

app.post("/api/reset-db", requireAdmin, async (req, res) => {
  try {
    await resetDatabase();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    const nets = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === "IPv4" && !net.internal) addresses.push(net.address);
      }
    }
    console.log("");
    console.log("=================================================");
    console.log("  Prestige Pro est démarré !");
    console.log("");
    console.log(`  Sur ce poste     : http://localhost:${PORT}`);
    if (addresses.length) {
      addresses.forEach((addr) => console.log(`  Autres postes    : http://${addr}:${PORT}`));
    } else {
      console.log("  Impossible de détecter l'adresse réseau locale.");
    }
    console.log("");
    console.log("  Laisse cette fenêtre ouverte tant que la");
    console.log("  boutique utilise l'application.");
    console.log("=================================================");
    console.log("");
  });
}

module.exports = app;
