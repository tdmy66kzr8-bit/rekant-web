import { useState, useEffect } from 'react';

export default function AdminKB() {
  const [token, setToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [kb, setKB] = useState(null);
  const [activeTab, setActiveTab] = useState('faq');
  const [newFaq, setNewFaq] = useState({ q: '', a: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Načti token z localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kb-admin-token');
      if (saved) {
        setToken(saved);
        tryLogin(saved);
      }
    }
  }, []);

  const tryLogin = async (t) => {
    try {
      const res = await fetch('/api/kb-manager', {
        method: 'GET',
        headers: { 'x-admin-token': t },
      });
      if (res.ok) {
        const data = await res.json();
        setKB(data);
        setIsLoggedIn(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('kb-admin-token', t);
        }
      }
    } catch (e) {
      console.error('Login error:', e);
    }
  };

  const handleLogin = () => {
    if (!token) {
      alert('Zadej token');
      return;
    }
    tryLogin(token);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setKB(null);
    setToken('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kb-admin-token');
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 4000);
  };

  const addFaq = async () => {
    if (!newFaq.q.trim() || !newFaq.a.trim()) {
      showMessage('Vyplň otázku i odpověď', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/kb-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({
          action: 'add-faq',
          q: newFaq.q,
          a: newFaq.a,
        }),
      });
      if (res.ok) {
        setNewFaq({ q: '', a: '' });
        await tryLogin(token);
        showMessage('✅ FAQ přidáno!');
      } else {
        showMessage('❌ Chyba při ukládání', 'error');
      }
    } catch (e) {
      showMessage('❌ ' + e.message, 'error');
    }
    setLoading(false);
  };

  const deleteFaq = async (idx) => {
    if (!confirm('Opravdu smazat?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/kb-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ action: 'delete-faq', index: idx }),
      });
      if (res.ok) {
        await tryLogin(token);
        showMessage('✅ Smazáno!');
      }
    } catch (e) {
      showMessage('❌ ' + e.message, 'error');
    }
    setLoading(false);
  };

  // AUTOMATICKÉ SKENOVÁNÍ WEBU
  const scanWebsite = async () => {
    if (!confirm('Spustit automatické skenování www.rekant.cz?\n\nPotrvá to ~30 sekund a stojí cca 0.30 Kč.')) {
      return;
    }
    setLoading(true);
    setScanResult(null);
    showMessage('🔄 Skenuji obsah webu... Čekej prosím...', 'info');

    try {
      const res = await fetch('/api/kb-scanner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
      });

      const data = await res.json();

      if (data.success && data.kb) {
        // Automaticky uložit do KB
        const saveRes = await fetch('/api/kb-manager', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': token,
          },
          body: JSON.stringify({
            action: 'update-full',
            kb: data.kb,
          }),
        });

        if (saveRes.ok) {
          await tryLogin(token);
          setScanResult(data);
          showMessage('✅ Web naskenován a KB aktualizována!', 'success');
        } else {
          showMessage('⚠️ Sken proběhl, ale uložení selhalo', 'error');
        }
      } else if (data.success) {
        await tryLogin(token);
        setScanResult(data);
        showMessage('✅ Web naskenován a KB aktualizována!', 'success');
      } else {
        showMessage('❌ Chyba: ' + (data.error || 'Neznámá chyba'), 'error');
      }
    } catch (e) {
      showMessage('❌ ' + e.message, 'error');
    }
    setLoading(false);
  };

  const exportKB = () => {
    if (!kb) return;
    const blob = new Blob([JSON.stringify(kb, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kb-backup-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
  };

  // PŘIHLÁŠENÍ
  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          background: '#fff',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          width: '400px',
          maxWidth: '90%',
        }}>
          <h2 style={{ marginTop: 0, color: '#cc1a1a' }}>🔐 Knowledge Base Admin</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>Zadej admin token pro přihlášení</p>
          <input
            type="password"
            placeholder="Admin token..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '15px',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '12px',
              background: '#cc1a1a',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            Přihlásit se
          </button>
        </div>
      </div>
    );
  }

  if (!kb) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Načítám...</div>;
  }

  return (
    <div style={{
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '2px solid #e5e7eb',
      }}>
        <h1 style={{ margin: 0, color: '#cc1a1a' }}>🤖 KB Admin Panel</h1>
        <button
          onClick={handleLogout}
          style={{
            background: '#666',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Odhlásit
        </button>
      </div>

      {/* MESSAGE */}
      {message && (
        <div style={{
          padding: '14px',
          marginBottom: '20px',
          borderRadius: '8px',
          background: message.type === 'error' ? '#fee2e2' : message.type === 'info' ? '#dbeafe' : '#dcfce7',
          color: message.type === 'error' ? '#991f1f' : message.type === 'info' ? '#1e40af' : '#166534',
          fontWeight: '500',
        }}>
          {message.text}
        </div>
      )}

      {/* HLAVNÍ TLAČÍTKO - AUTOMATICKÉ SKENOVÁNÍ */}
      <div style={{
        background: 'linear-gradient(135deg, #cc1a1a 0%, #9b1313 100%)',
        color: '#fff',
        padding: '30px',
        borderRadius: '12px',
        marginBottom: '30px',
        textAlign: 'center',
      }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>
          🚀 Automatické učení chatu
        </h2>
        <p style={{ margin: '0 0 20px 0', opacity: 0.9 }}>
          Klikni a chat se automaticky naučí všechny informace z www.rekant.cz
        </p>
        <button
          onClick={scanWebsite}
          disabled={loading}
          style={{
            background: '#fff',
            color: '#cc1a1a',
            border: 'none',
            padding: '16px 32px',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? '🔄 Skenuji a učím chat...' : '🔄 Aktualizovat znalosti z webu'}
        </button>
        {scanResult && scanResult.tokensUsed && (
          <p style={{ margin: '15px 0 0 0', fontSize: '13px', opacity: 0.8 }}>
            ✅ Použito {scanResult.tokensUsed.input_tokens} input + {scanResult.tokensUsed.output_tokens} output tokenů
          </p>
        )}
      </div>

      {/* ZÁLOŽKY */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
        {['faq', 'company', 'preview'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab ? '#cc1a1a' : '#f3f4f6',
              color: activeTab === tab ? '#fff' : '#374151',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            {tab === 'faq' && '❓ FAQ'}
            {tab === 'company' && '🏢 Firma'}
            {tab === 'preview' && '👁️ Náhled KB'}
          </button>
        ))}
      </div>

      {/* FAQ TAB */}
      {activeTab === 'faq' && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h3>➕ Přidat novou FAQ otázku</h3>
          <input
            type="text"
            placeholder="Otázka..."
            value={newFaq.q}
            onChange={(e) => setNewFaq({ ...newFaq, q: e.target.value })}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              marginBottom: '10px',
              boxSizing: 'border-box',
            }}
          />
          <textarea
            placeholder="Odpověď..."
            value={newFaq.a}
            onChange={(e) => setNewFaq({ ...newFaq, a: e.target.value })}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              marginBottom: '10px',
              minHeight: '80px',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={addFaq}
            disabled={loading}
            style={{
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ➕ Přidat FAQ
          </button>

          <h3 style={{ marginTop: '30px' }}>📋 Existující FAQ ({kb.faq?.length || 0})</h3>
          {kb.faq && kb.faq.length > 0 ? (
            kb.faq.map((item, idx) => (
              <div key={idx} style={{
                background: '#f9fafb',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '10px',
                borderLeft: '3px solid #cc1a1a',
              }}>
                <strong>Q: {item.q}</strong>
                <p style={{ margin: '5px 0', color: '#666' }}>A: {item.a}</p>
                <button
                  onClick={() => deleteFaq(idx)}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    padding: '4px 10px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  🗑 Smazat
                </button>
              </div>
            ))
          ) : (
            <p style={{ color: '#666' }}>Žádné FAQ.</p>
          )}
        </div>
      )}

      {/* COMPANY TAB */}
      {activeTab === 'company' && kb.company && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h3>🏢 Informace o firmě</h3>
          <pre style={{
            background: '#f9fafb',
            padding: '15px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '13px',
          }}>
            {JSON.stringify(kb.company, null, 2)}
          </pre>
        </div>
      )}

      {/* PREVIEW TAB */}
      {activeTab === 'preview' && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h3>👁️ Celý obsah Knowledge Base</h3>
          <pre style={{
            background: '#f9fafb',
            padding: '15px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '12px',
            maxHeight: '500px',
          }}>
            {JSON.stringify(kb, null, 2)}
          </pre>
        </div>
      )}

      {/* TLAČÍTKO EXPORT */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          onClick={exportKB}
          style={{
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          ⬇️ Stáhnout zálohu KB (JSON)
        </button>
      </div>

      {/* INFO */}
      <p style={{ textAlign: 'center', marginTop: '30px', color: '#666', fontSize: '12px' }}>
        🤖 Chat se učí z této KB. Změny se projeví okamžitě.
      </p>
    </div>
  );
}

// Vypnout SSR aby fungovalo na Vercelu
export async function getServerSideProps() {
  return {
    props: {},
  };
}
