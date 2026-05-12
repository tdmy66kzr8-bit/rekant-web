import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const KB_KEY = "rekant:kb";

const GITHUB_OWNER = "tdmy66kzr8-bit";
const GITHUB_REPO = "rekant-web";
const GITHUB_FILE = "public/rekant.html";
const GITHUB_BRANCH = "main";

function checkAuth(token) {
  return token === process.env.ADMIN_TOKEN;
}

// Načti aktuální rekant.html z GitHubu
async function getCurrentHTML() {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub GET failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  
  return {
    content,
    sha: data.sha,
  };
}

// Pushni nový HTML zpět na GitHub
async function pushHTML(newContent, sha, message) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: message,
      content: Buffer.from(newContent, "utf-8").toString("base64"),
      sha: sha,
      branch: GITHUB_BRANCH,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub PUT failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Najdi a nahraď telefonní číslo v HTML
function replaceContact(html, oldValue, newValue) {
  if (!oldValue || !newValue || oldValue === newValue) return html;
  
  // Escape special regex chars
  const escapedOld = oldValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escapedOld, "g");
  
  return html.replace(regex, newValue);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const token = req.headers["x-admin-token"];
  if (!checkAuth(token)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // 1. NAČTI AKTUÁLNÍ KB
    const kb = await redis.get(KB_KEY);
    if (!kb || !kb.company) {
      return res.status(404).json({ success: false, error: "KB nedostupná" });
    }

    const c = kb.company;

    // 2. STÁHNI AKTUÁLNÍ HTML Z GITHUBU
    const { content: currentHTML, sha } = await getCurrentHTML();

    // 3. NAJDI A NAHRAĎ KONTAKTY
    // Výchozí (původní) hodnoty co hledáme v HTML
    const originalContacts = {
      phone: "244 471 760",
      phone_shop: "777 041 813",
      phone_service: "777 613 044",
      email: "rekant@rekant.cz",
      email_service: "jan.honc@rekant.cz",
      hours: "Po–Pá 8:00–16:00",
      address: "Severozápadní I. 285/8",
      ico: "28233727",
      vat: "CZ28233727",
    };

    let newHTML = currentHTML;
    const changes = [];

    // Telefon (ústředna)
    if (c.phone && c.phone !== originalContacts.phone) {
      newHTML = replaceContact(newHTML, originalContacts.phone, c.phone);
      changes.push(`Telefon (ústředna): ${originalContacts.phone} → ${c.phone}`);
    }

    // Telefon (prodejna)
    if (c.phone_shop && c.phone_shop !== originalContacts.phone_shop) {
      newHTML = replaceContact(newHTML, originalContacts.phone_shop, c.phone_shop);
      changes.push(`Telefon (prodejna): ${originalContacts.phone_shop} → ${c.phone_shop}`);
    }

    // Telefon (servis)
    if (c.phone_service && c.phone_service !== originalContacts.phone_service) {
      newHTML = replaceContact(newHTML, originalContacts.phone_service, c.phone_service);
      changes.push(`Telefon (servis): ${originalContacts.phone_service} → ${c.phone_service}`);
    }

    // Email
    if (c.email && c.email !== originalContacts.email) {
      newHTML = replaceContact(newHTML, originalContacts.email, c.email);
      changes.push(`Email: ${originalContacts.email} → ${c.email}`);
    }

    // Email (servis)
    if (c.email_service && c.email_service !== originalContacts.email_service) {
      newHTML = replaceContact(newHTML, originalContacts.email_service, c.email_service);
      changes.push(`Email (servis): ${originalContacts.email_service} → ${c.email_service}`);
    }

    // Pracovní doba
    if (c.hours && c.hours !== originalContacts.hours) {
      newHTML = replaceContact(newHTML, originalContacts.hours, c.hours);
      changes.push(`Pracovní doba: ${originalContacts.hours} → ${c.hours}`);
    }

    // 4. POKUD JSOU ZMĚNY, PUSHNI
    if (newHTML === currentHTML) {
      return res.status(200).json({
        success: true,
        message: "Web už je synchronizovaný s KB. Žádné změny.",
        changes: [],
      });
    }

    const commitMessage = `Auto-sync kontaktů z KB\n\nZměny:\n${changes.join("\n")}`;
    const result = await pushHTML(newHTML, sha, commitMessage);

    return res.status(200).json({
      success: true,
      message: "Web synchronizován s KB! Vercel automaticky deployuje (~3 min).",
      changes,
      commitUrl: result.commit?.html_url,
      deploymentNote: "Změny budou na webu za 2-3 minuty po dokončení Vercel deploye.",
    });
  } catch (error) {
    console.error("Sync website error:", error);
    return res.status(500).json({
      success: false,
      error: "Sync website failed",
      details: error.message,
    });
  }
}
