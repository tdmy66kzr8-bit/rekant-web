// pages/admin/kb.jsx
import { useState, useEffect } from "react";

export async function getServerSideProps(context) {
  // Ujistit se, že tato stránka není v sitemaps a není indexovatelná
  context.res.setHeader("X-Robots-Tag", "noindex, nofollow");
  return { props: {} };
}

export default function KBAdmin() {
  const [kb, setKb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("faq"); // faq, company, products
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState(""); // success, error

  // Tab pro přidávání FAQ
  const [newFaqQ, setNewFaqQ] = useState("");
  const [newFaqA, setNewFaqA] = useState("");

  // Tab pro editaci firmy
  const [companyData, setCompanyData] = useState({});

  // Tab pro produkty
  const [productKey, setProductKey] = useState("");
  const [productJson, setProductJson] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("admin_token");
    if (stored) {
      setToken(stored);
      setAuthenticated(true);
      loadKB(stored);
    }
    setLoading(false);
  }, []);

  const loadKB = async (adminToken) => {
    try {
      const res = await fetch("/api/kb-manager", {
        headers: { "x-admin-token": adminToken },
      });
      if (!res.ok) throw new Error("Neautorizováno");
      const data = await res.json();
      setKb(data);
      setCompanyData(data.company || {});
    } catch (e) {
      showMessage("Chyba: " + e.message, "error");
      setAuthenticated(false);
    }
  };

  const login = () => {
    if (!token) {
      showMessage("Zadejte token", "error");
      return;
    }
    localStorage.setItem("admin_token", token);
    setAuthenticated(true);
    loadKB(token);
    showMessage("Přihlášeni", "success");
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setAuthenticated(false);
    setKb(null);
    showMessage("Odhlášeni", "success");
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMsgType(type);
    setTimeout(() => setMessage(""), 4000);
  };

  const addFaq = async () => {
    if (!newFaqQ || !newFaqA) {
      showMessage("Vyplňte obě pole", "error");
      return;
    }
    try {
      const res = await fetch("/api/kb-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({
          action: "add-faq",
          data: { question: newFaqQ, answer: newFaqA },
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setKb(result.kb);
      setNewFaqQ("");
      setNewFaqA("");
      showMessage("FAQ přidáno", "success");
    } catch (e) {
      showMessage("Chyba: " + e.message, "error");
    }
  };

  const deleteFaq = async (index) => {
    if (!confirm("Smazat toto FAQ?")) return;
    try {
      const res = await fetch("/api/kb-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({
          action: "delete-faq",
          data: { index },
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setKb(result.kb);
      showMessage("FAQ smazáno", "success");
    } catch (e) {
      showMessage("Chyba: " + e.message, "error");
    }
  };

  const updateCompanyInfo = async () => {
    try {
      const res = await fetch("/api/kb-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({
          action: "update-company-info",
          data: { companyData },
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setKb(result.kb);
      showMessage("Informace o firmě aktualizovány", "success");
    } catch (e) {
      showMessage("Chyba: " + e.message, "error");
    }
  };

  const addOrUpdateProduct = async () => {
    if (!productKey || !productJson) {
      showMessage("Vyplňte klíč produktu a JSON", "error");
      return;
    }
    try {
      const parsedData = JSON.parse(productJson);
      const res = await fetch("/api/kb-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({
          action: "add-product",
          data: { productKey, productData: parsedData },
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setKb(result.kb);
      setProductKey("");
      setProductJson("");
      showMessage("Produkt uložen", "success");
    } catch (e) {
      showMessage("Chyba JSON parsování nebo API: " + e.message, "error");
    }
  };

  const exportKBJson = () => {
    if (!kb) return;
    const json = JSON.stringify(kb, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekant-kb-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    showMessage("Staženo", "success");
  };

  if (loading) {
    return <div style={{ padding: "20px" }}>Načítání...</div>;
  }

  if (!authenticated) {
    return (
      <div style={{ maxWidth: "400px", margin: "40px auto", padding: "20px" }}>
        <h1>🔐 Přihlášení do KB Adminu</h1>
        <p style={{ marginBottom: "10px", color: "#666" }}>
          Vyžaduje admin token (nastavit v .env.local)
        </p>
        <input
          type="password"
          placeholder="Admin token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "10px",
            border: "1px solid #ddd",
            borderRadius: "5px",
            fontFamily: "monospace",
          }}
        />
        <button
          onClick={login}
          style={{
            width: "100%",
            padding: "10px",
            background: "#cc1a1a",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Přihlásit se
        </button>
      </div>
    );
  }

  if (!kb) {
    return <div style={{ padding: "20px" }}>Načítání knowledge base...</div>;
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>🤖 Knowledge Base Admin</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={exportKBJson}
            style={{
              padding: "10px 20px",
              background: "#0f2040",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            ⬇️ Export JSON
          </button>
          <button
            onClick={logout}
            style={{
              padding: "10px 20px",
              background: "#999",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Odhlásit se
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: "15px",
            marginBottom: "20px",
            background: msgType === "success" ? "#d4edda" : "#f8d7da",
            color: msgType === "success" ? "#155724" : "#721c24",
            border: `1px solid ${msgType === "success" ? "#c3e6cb" : "#f5c6cb"}`,
            borderRadius: "5px",
          }}
        >
          {message}
        </div>
      )}

      {/* Záložky */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {["faq", "company", "products"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 20px",
              background: activeTab === tab ? "#cc1a1a" : "#e5e7eb",
              color: activeTab === tab ? "#fff" : "#000",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {tab === "faq" && "❓ FAQ"}
            {tab === "company" && "🏢 Firma"}
            {tab === "products" && "📦 Produkty"}
          </button>
        ))}
      </div>

      {/* TAB: FAQ */}
      {activeTab === "faq" && (
        <div style={{ background: "#f9fafb", padding: "20px", borderRadius: "8px" }}>
          <h2>Správa FAQ</h2>

          <div style={{ marginBottom: "30px", marginTop: "20px" }}>
            <h3>Přidat nové FAQ</h3>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Otázka:
              </label>
              <input
                type="text"
                value={newFaqQ}
                onChange={(e) => setNewFaqQ(e.target.value)}
                placeholder="Jakou otázku řešit?"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "5px",
                  fontFamily: "var(--font)",
                }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Odpověď:
              </label>
              <textarea
                value={newFaqA}
                onChange={(e) => setNewFaqA(e.target.value)}
                placeholder="Odpověď na otázku..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "5px",
                  fontFamily: "var(--font)",
                }}
              />
            </div>
            <button
              onClick={addFaq}
              style={{
                padding: "10px 20px",
                background: "#cc1a1a",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ➕ Přidat FAQ
            </button>
          </div>

          <h3>Aktuální FAQ ({kb.faq?.length || 0})</h3>
          {kb.faq && kb.faq.length > 0 ? (
            kb.faq.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: "#fff",
                  padding: "15px",
                  marginBottom: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "5px",
                }}
              >
                <strong>Q: {item.q}</strong>
                <p style={{ marginTop: "8px", color: "#666" }}>A: {item.a}</p>
                <button
                  onClick={() => deleteFaq(idx)}
                  style={{
                    padding: "5px 10px",
                    background: "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  🗑️ Smazat
                </button>
              </div>
            ))
          ) : (
            <p>Žádné FAQ zatím neexistuje.</p>
          )}
        </div>
      )}

      {/* TAB: Firma */}
      {activeTab === "company" && (
        <div style={{ background: "#f9fafb", padding: "20px", borderRadius: "8px" }}>
          <h2>Údaje o firmě</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            {["name", "address", "phone", "phone_shop", "phone_service", "email", "hours"].map(
              (field) => (
                <div key={field}>
                  <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}>
                    {field.replace(/_/g, " ")}:
                  </label>
                  <input
                    type="text"
                    value={companyData[field] || ""}
                    onChange={(e) =>
                      setCompanyData({ ...companyData, [field]: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "5px",
                    }}
                  />
                </div>
              )
            )}
          </div>
          <button
            onClick={updateCompanyInfo}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#cc1a1a",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ✅ Uložit údaje
          </button>
        </div>
      )}

      {/* TAB: Produkty */}
      {activeTab === "products" && (
        <div style={{ background: "#f9fafb", padding: "20px", borderRadius: "8px" }}>
          <h2>Správa produktů</h2>

          <div style={{ marginBottom: "30px", marginTop: "20px" }}>
            <h3>Přidat nebo aktualizovat produkt</h3>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Klíč produktu (např. "konica_minolta"):
              </label>
              <input
                type="text"
                value={productKey}
                onChange={(e) => setProductKey(e.target.value)}
                placeholder="product_key"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "5px",
                }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                JSON data:
              </label>
              <textarea
                value={productJson}
                onChange={(e) => setProductJson(e.target.value)}
                placeholder={`{\n  "name": "Produkt",\n  "description": "Popis",\n  "price": "od 1000 Kč"\n}`}
                rows={8}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "5px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
              />
            </div>
            <button
              onClick={addOrUpdateProduct}
              style={{
                padding: "10px 20px",
                background: "#cc1a1a",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ➕ Uložit produkt
            </button>
          </div>

          <h3>Aktuální produkty ({Object.keys(kb.products || {}).length})</h3>
          <pre
            style={{
              background: "#fff",
              padding: "15px",
              borderRadius: "5px",
              overflow: "auto",
              fontSize: "12px",
              maxHeight: "400px",
            }}
          >
            {JSON.stringify(kb.products, null, 2)}
          </pre>
        </div>
      )}

      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          background: "#f0f4fd",
          borderRadius: "5px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        <strong>💡 Tip:</strong> Tato stránka je skrytá od vyhledávačů (noindex). Změny se
        automaticky synchronizují s chat API.
      </div>
    </div>
  );
}
