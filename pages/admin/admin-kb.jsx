import { useState, useEffect } from 'react';

export default function AdminKB() {
  const [kb, setKB] = useState(null);
  const [token, setToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [editingFaq, setEditingFaq] = useState(null);
  const [newFaq, setNewFaq] = useState({ q: '', a: '' });
  const [message, setMessage] = useState('');

  // Kontrola tokenu při loadu
  useEffect(() => {
    const savedToken = localStorage.getItem('kb-admin-token');
    if (savedToken) {
      setToken(savedToken);
      loadKB(savedToken);
      setIsLoggedIn(true);
    }
  }, []);

  // Přihlášení
  const handleLogin = async () => {
    try {
      const response = await fetch('/api/kb-manager', {
        method: 'GET',
        headers: { 'x-admin-token': token }
      });
      if (response.ok) {
        localStorage.setItem('kb-admin-token', token);
        setIsLoggedIn(true);
        loadKB(token);
      } else {
        alert('❌ Nesprávný token');
      }
    } catch (e) {
      alert('Chyba: ' + e.message);
    }
  };

  // Načíst KB
  const loadKB = async (t) => {
    try {
      const response = await fetch('/api/kb-manager', {
        headers: { 'x-admin-token': t }
      });
      if (response.ok) {
        const data = await response.json();
        setKB(data);
      }
    } catch (e) {
      console.error('Load KB error:', e);
    }
  };

  // Uložit KB
  const saveKB = async () => {
    try {
      const response = await fetch('/api/kb-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify({
          action: 'update-full',
          kb: kb
        })
      });
      if (response.ok) {
        setMessage('✅ KB uložena!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Chyba při ukládání');
      }
    } catch (e) {
      setMessage('❌ ' + e.message);
    }
  };

  // Přidat FAQ
  const addFaq = async () => {
    if (!newFaq.q || !newFaq.a) {
      alert('Vyplň otázku i odpověď');
      return;
    }
    try {
      const response = await fetch('/api/kb-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify({
          action: 'add-faq',
          q: newFaq.q,
          a: newFaq.a
        })
      });
      if (response.ok) {
        setNewFaq({ q: '', a: '' });
        loadKB(token);
        setMessage('✅ FAQ přidáno!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (e) {
      setMessage('❌ ' + e.message);
    }
  };

  // Smazat FAQ
  const deleteFaq = async (index) => {
    if (!confirm('Opravdu smazat?')) return;
    try {
      const response = await fetch('/api/kb-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify({
          action: 'delete-faq',
          index: index
        })
      });
      if (response.ok) {
        loadKB(token);
        setMessage('✅ FAQ smazáno!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (e) {
      setMessage('❌ ' + e.message);
    }
  };

  // Export KB
  const exportKB = () => {
    const blob = new Blob([JSON.stringify(kb, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kb-backup.json';
    a.click();
  };

  if (!isLoggedIn) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
        <h2>🔐 Přihlášení do KB Admin</h2>
        <input
          type="password"
          placeholder="Zadej admin token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button onClick={handleLogin} style={{ width: '100%', padding: '10px', background: '#cc1a1a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Přihlásit se
        </button>
      </div>
    );
  }

  if (!kb) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Načítám...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>📚 Knowledge Base Editor</h1>
        <button onClick={() => { localStorage.clear(); setIsLoggedIn(false); }} style={{ background: '#999', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Odhlásit
        </button>
      </div>

      {message && <div style={{ background: message.includes('✅') ? '#dcfce7' : '#fee2e2', color: message.includes('✅') ? '#166534' : '#991f1f', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
        {message}
      </div>}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
        <button onClick={() => setActiveTab('company')} style={{ padding: '10px 16px', background: activeTab === 'company' ? '#cc1a1a' : '#f3f4f6', color: activeTab === 'company' ? '#fff' : '#000', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontWeight: 'bold' }}>
          🏢 Firma
        </button>
        <button onClick={() => setActiveTab('products')} style={{ padding: '10px 16px', background: activeTab === 'products' ? '#cc1a1a' : '#f3f4f6', color: activeTab === 'products' ? '#fff' : '#000', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontWeight: 'bold' }}>
          📦 Produkty
        </button>
        <button onClick={() => setActiveTab('faq')} style={{ padding: '10px 16px', background: activeTab === 'faq' ? '#cc1a1a' : '#f3f4f6', color: activeTab === 'faq' ? '#fff' : '#000', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontWeight: 'bold' }}>
          ❓ FAQ
        </button>
      </div>

      {/* FIRMA */}
      {activeTab === 'company' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h2>Základní údaje firmy</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label>Název</label>
              <input type="text" value={kb.company.name} onChange={(e) => setKB({ ...kb, company: { ...kb.company, name: e.target.value } })} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            <div>
              <label>Email</label>
              <input type="text" value={kb.company.email} onChange={(e) => setKB({ ...kb, company: { ...kb.company, email: e.target.value } })} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            <div>
              <label>Telefon (ústředna)</label>
              <input type="text" value={kb.company.phone} onChange={(e) => setKB({ ...kb, company: { ...kb.company, phone: e.target.value } })} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            <div>
              <label>Pracovní doba</label>
              <input type="text" value={kb.company.hours} onChange={(e) => setKB({ ...kb, company: { ...kb.company, hours: e.target.value } })} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
          </div>
          <div style={{ marginTop: '15px' }}>
            <label>Adresa</label>
            <textarea value={kb.company.address} onChange={(e) => setKB({ ...kb, company: { ...kb.company, address: e.target.value } })} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', minHeight: '60px' }} />
          </div>
        </div>
      )}

      {/* PRODUKTY */}
      {activeTab === 'products' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h2>Produkty a popis služeb</h2>
          <div>
            <label>Obecný popis služeb</label>
            <textarea value={kb.services.overview} onChange={(e) => setKB({ ...kb, services: { ...kb.services, overview: e.target.value } })} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', minHeight: '100px' }} />
          </div>
          <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>💡 Podrobné editace produktů si edituj přímou úpravou JSON v kb.json souboru.</p>
        </div>
      )}

      {/* FAQ */}
      {activeTab === 'faq' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h2>❓ Často kladené otázky</h2>

          <div style={{ background: '#f3f4f6', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>Přidat nové FAQ</h3>
            <textarea
              placeholder="Otázka..."
              value={newFaq.q}
              onChange={(e) => setNewFaq({ ...newFaq, q: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '10px', minHeight: '40px' }}
            />
            <textarea
              placeholder="Odpověď..."
              value={newFaq.a}
              onChange={(e) => setNewFaq({ ...newFaq, a: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '10px', minHeight: '60px' }}
            />
            <button onClick={addFaq} style={{ background: '#16a34a', color: '#fff', padding: '10px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              ➕ Přidat FAQ
            </button>
          </div>

          <h3>Existující FAQ</h3>
          {kb.faq && kb.faq.length > 0 ? (
            kb.faq.map((item, idx) => (
              <div key={idx} style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px', marginBottom: '10px', borderLeft: '3px solid #cc1a1a' }}>
                <strong>Q: {item.q}</strong>
                <p style={{ margin: '5px 0', color: '#666' }}>A: {item.a}</p>
                <button onClick={() => deleteFaq(idx)} style={{ background: '#dc2626', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  🗑 Smazat
                </button>
              </div>
            ))
          ) : (
            <p style={{ color: '#666' }}>Žádné FAQ dosud.</p>
          )}
        </div>
      )}

      {/* TLAČÍTKA */}
      <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button onClick={saveKB} style={{ background: '#cc1a1a', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
          💾 Uložit KB (aktualizovat chat)
        </button>
        <button onClick={exportKB} style={{ background: '#3b82f6', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
          ⬇️ Exportovat zálohu
        </button>
      </div>

      <p style={{ textAlign: 'center', marginTop: '20px', color: '#666', fontSize: '12px' }}>
        💡 Po kliknutí "Uložit KB" se chat automaticky aktualizuje a bude znát nové informace.
      </p>
    </div>
  );
}

export async function getServerSideProps(context) {
  return {
    props: {},
    revalidate: false
  };
}
