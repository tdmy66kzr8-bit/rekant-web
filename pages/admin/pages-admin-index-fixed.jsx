import { useState, useEffect } from 'react';

export default function AdminKB() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [kb, setKB] = useState(null);
  const [activeTab, setActiveTab] = useState('company');
  const [newFaq, setNewFaq] = useState({ q: '', a: '' });
  const [newNews, setNewNews] = useState({ title: '', description: '', tag: 'Novinka', author: '', date: new Date().toISOString().split('T')[0] });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // CAPTCHA state
  const [captchaQ, setCaptchaQ] = useState('');
  const [captchaAns, setCaptchaAns] = useState(0);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const ADMIN_PASSWORD = 'Rekant2026!';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAuth = localStorage.getItem('cmsAuth');
      if (savedAuth === '1') {
        setIsLoggedIn(true);
        loadKB();
      } else {
        initCaptcha();
      }
    }
  }, []);

  const initCaptcha = () => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    setCaptchaQ(`${a} + ${b}`);
    setCaptchaAns(a + b);
    setCaptchaInput('');
    setPassword('');
    setCaptchaVerified(false);
    setLoginError('');
  };

  const verifyCaptcha = () => {
    if (parseInt(captchaInput) === captchaAns) {
      setCaptchaVerified(true);
      setLoginError('');
    } else {
      setLoginError('⚠️ Špatná odpověď.');
      setCaptchaInput('');
    }
  };

  const handleLogin = () => {
    if (!captchaVerified) {
      setLoginError('⚠️ Nejdříve ověř CAPTCHA.');
      return;
    }
    if (password !== ADMIN_PASSWORD) {
      setLoginError('⚠️ Nesprávné heslo.');
      setPassword('');
      return;
    }
    localStorage.setItem('cmsAuth', '1');
    setIsLoggedIn(true);
    loadKB();
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setKB(null);
    setPassword('');
    localStorage.removeItem('cmsAuth');
    initCaptcha();
  };

  const loadKB = async () => {
    try {
      const res = await fetch('/api/kb-manager', {
        method: 'GET',
      });
      if (res.ok) {
        const data = await res.json();
        setKB(data);
        setHasChanges(false);
      } else {
        showMessage('Chyba při načítání KB', 'error');
      }
    } catch (e) {
      console.error('KB load error:', e);
      showMessage('Chyba připojení', 'error');
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 5000);
  };

  const saveKB = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kb-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'update-full', kb }),
      });
      if (res.ok) {
        showMessage('Zmeny ulozeny! Chat se okamzite nauci.');
        setHasChanges(false);
      } else {
        showMessage('Chyba ukladani', 'error');
      }
    } catch (e) {
      showMessage(e.message, 'error');
    }
    setLoading(false);
  };

  const updateCompany = (field, value) => {
    setKB({ ...kb, company: { ...kb.company, [field]: value } });
    setHasChanges(true);
  };

  const updateService = (key, field, value) => {
    setKB({
      ...kb,
      services: { ...kb.services, [key]: { ...kb.services[key], [field]: value } },
    });
    setHasChanges(true);
  };

  const updateServiceArray = (key, field, value) => {
    const arr = value.split(',').map(s => s.trim()).filter(Boolean);
    setKB({
      ...kb,
      services: { ...kb.services, [key]: { ...kb.services[key], [field]: arr } },
    });
    setHasChanges(true);
  };

  const updateProduct = (key, field, value) => {
    setKB({
      ...kb,
      products: { ...kb.products, [key]: { ...kb.products[key], [field]: value } },
    });
    setHasChanges(true);
  };

  const updateProductFeatures = (key, value) => {
    const features = value.split('\n').map(s => s.trim()).filter(Boolean);
    setKB({
      ...kb,
      products: { ...kb.products, [key]: { ...kb.products[key], features } },
    });
    setHasChanges(true);
  };

  // NEWS MANAGEMENT
  const addNews = () => {
    if (!newNews.title.trim() || !newNews.description.trim()) {
      showMessage('Vypln titulek i popis', 'error');
      return;
    }
    const newsArray = kb.news || [];
    newsArray.push({
      id: Date.now().toString(),
      title: newNews.title,
      description: newNews.description,
      tag: newNews.tag,
      author: newNews.author || 'Rekant',
      date: newNews.date,
    });
    setKB({ ...kb, news: newsArray });
    setNewNews({ title: '', description: '', tag: 'Novinka', author: '', date: new Date().toISOString().split('T')[0] });
    setHasChanges(true);
    showMessage('Novinka pridana (nezapomen ulozit)');
  };

  const updateNews = (idx, field, value) => {
    const newsArray = [...kb.news];
    newsArray[idx] = { ...newsArray[idx], [field]: value };
    setKB({ ...kb, news: newsArray });
    setHasChanges(true);
  };

  const deleteNews = (idx) => {
    if (!confirm('Opravdu smazat tuto novinku?')) return;
    const newsArray = kb.news.filter((_, i) => i !== idx);
    setKB({ ...kb, news: newsArray });
    setHasChanges(true);
  };

  const addFaq = () => {
    if (!newFaq.q.trim() || !newFaq.a.trim()) {
      showMessage('Vypln otazku i odpoved', 'error');
      return;
    }
    setKB({ ...kb, faq: [...(kb.faq || []), { q: newFaq.q, a: newFaq.a }] });
    setNewFaq({ q: '', a: '' });
    setHasChanges(true);
    showMessage('FAQ pridano (nezapomen ulozit)');
  };

  const updateFaq = (idx, field, value) => {
    const newFaqs = [...kb.faq];
    newFaqs[idx] = { ...newFaqs[idx], [field]: value };
    setKB({ ...kb, faq: newFaqs });
    setHasChanges(true);
  };

  const deleteFaq = (idx) => {
    if (!confirm('Opravdu smazat?')) return;
    const newFaqs = kb.faq.filter((_, i) => i !== idx);
    setKB({ ...kb, faq: newFaqs });
    setHasChanges(true);
  };

  const scanWebsite = async () => {
    if (!confirm('Spustit automaticke skenovani www.rekant.cz?\n\nAktualizuje POPISY, NOVINKY a FAQ, kontakty zachova.')) return;
    setLoading(true);
    showMessage('Skenuji obsah webu...', 'info');

    try {
      const res = await fetch('/api/kb-scanner', {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success && data.kb) {
        const saveRes = await fetch('/api/kb-manager', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'update-full', kb: data.kb }),
        });
        if (saveRes.ok) {
          await loadKB();
          showMessage('Chat naskenoval web a naucil se!');
        }
      } else {
        showMessage('Chyba: ' + (data.error || 'Neznama'), 'error');
      }
    } catch (e) {
      showMessage(e.message, 'error');
    }
    setLoading(false);
  };

  const syncWebsite = async () => {
    if (!confirm('Synchronizovat kontakty na www.rekant.cz?\n\nTato akce:\n• Vezme aktuální KB\n• Aktualizuje rekant.html na GitHubu\n• Vercel automaticky deployuje (~3 min)\n• Změny budou viditelné na webu\n\nPokračovat?')) return;

    setLoading(true);
    setSyncResult(null);
    showMessage('Synchronizuji web... Toto chvíli trvá...', 'info');

    try {
      const res = await fetch('/api/sync-website', {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        setSyncResult(data);
        if (data.changes && data.changes.length > 0) {
          showMessage(`Web synchronizován! Změny: ${data.changes.length}`, 'success');
        } else {
          showMessage('Web už je synchronizovaný - žádné změny', 'info');
        }
      } else {
        showMessage('Chyba: ' + (data.error || data.details || 'Neznámá'), 'error');
      }
    } catch (e) {
      showMessage(e.message, 'error');
    }
    setLoading(false);
  };

  const exportKB = () => {
    if (!kb) return;
    const blob = new Blob([JSON.stringify(kb, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kb-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
  };

  const styles = {
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontSize: '13px',
      color: '#374151',
      fontWeight: '600',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '15px',
      marginBottom: '15px',
    },
    card: {
      background: '#fff',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      marginBottom: '20px',
    },
    productCard: {
      background: '#f9fafb',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      borderLeft: '4px solid #cc1a1a',
    },
    btn: {
      background: '#cc1a1a',
      color: '#fff',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '14px',
    },
    btnSecondary: {
      background: '#3b82f6',
      color: '#fff',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '14px',
    },
    btnDanger: {
      background: '#dc2626',
      color: '#fff',
      padding: '6px 14px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
    },
    tab: (isActive) => ({
      padding: '12px 20px',
      background: isActive ? '#cc1a1a' : '#f3f4f6',
      color: isActive ? '#fff' : '#374151',
      border: 'none',
      borderRadius: '8px 8px 0 0',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '13px',
    }),
    tagBadge: (tag) => {
      const colors = {
        'Novinka': '#2563eb',
        'Akce': '#dc2626',
        'Tip': '#16a34a',
      };
      return {
        display: 'inline-block',
        background: colors[tag] || '#6b7280',
        color: '#fff',
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        marginRight: '8px',
      };
    },
  };

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
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔒</div>
            <h2 style={{ marginTop: 0, color: '#cc1a1a' }}>Přihlášení do CMS</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>Zadejte heslo správce</p>
          </div>

          {/* CAPTCHA */}
          <div style={{
            background: '#f3f4f6',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <div style={{ marginBottom: '10px', fontSize: '13px', color: '#374151' }}>
              <strong>ℹ️ Ověřte, že nejste robot</strong>
            </div>
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              marginBottom: '10px',
            }}>
              <input
                type="text"
                value={captchaQ}
                readOnly
                style={{
                  ...styles.input,
                  background: '#fff',
                  flex: 1,
                  padding: '10px',
                  border: '2px solid #cc1a1a',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
              />
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>=</span>
              <input
                type="number"
                placeholder="0"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && verifyCaptcha()}
                style={{
                  ...styles.input,
                  width: '70px',
                  padding: '10px',
                }}
              />
              <button
                onClick={verifyCaptcha}
                style={{
                  ...styles.btn,
                  padding: '10px 16px',
                  minWidth: '60px',
                }}
              >
                OK
              </button>
            </div>
            {captchaVerified && (
              <div style={{ color: '#15803d', fontWeight: '700' }}>✅ Ověřeno!</div>
            )}
          </div>

          {/* HESLO */}
          <input
            type="password"
            placeholder="Heslo..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            style={{ ...styles.input, marginBottom: '15px' }}
          />

          {/* ERROR */}
          {loginError && (
            <div style={{
              background: '#fee2e2',
              color: '#991f1f',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '15px',
              fontSize: '14px',
            }}>
              {loginError}
            </div>
          )}

          {/* TLAČÍTKA */}
          <button
            onClick={handleLogin}
            style={{ ...styles.btn, width: '100%', marginBottom: '8px' }}
          >
            Přihlásit se →
          </button>
          <button
            onClick={initCaptcha}
            style={{
              ...styles.btnSecondary,
              width: '100%',
            }}
          >
            Zrušit
          </button>
        </div>
      </div>
    );
  }

  if (!kb) return <div style={{ padding: '40px', textAlign: 'center' }}>Nacitam...</div>;

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#fff',
        padding: '15px 0',
        marginBottom: '20px',
        borderBottom: '2px solid #e5e7eb',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, color: '#cc1a1a', fontSize: '24px' }}>KB Admin Panel</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          {hasChanges && (
            <button onClick={saveKB} disabled={loading} style={{ ...styles.btn, background: '#16a34a' }}>
              Ulozit zmeny
            </button>
          )}
          <button onClick={handleLogout} style={{ ...styles.btn, background: '#666' }}>
            Odhlasit
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: '8px',
          background: message.type === 'error' ? '#fee2e2' : message.type === 'info' ? '#dbeafe' : '#dcfce7',
          color: message.type === 'error' ? '#991f1f' : message.type === 'info' ? '#1e40af' : '#166534',
          fontWeight: '500',
        }}>
          {message.text}
        </div>
      )}

      {syncResult && syncResult.changes && syncResult.changes.length > 0 && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '8px',
          background: '#dcfce7',
          border: '1px solid #16a34a',
        }}>
          <strong style={{ color: '#166534' }}>✅ Synchronizace dokončena!</strong>
          <ul style={{ marginTop: '8px', marginBottom: 0, color: '#166534' }}>
            {syncResult.changes.map((change, i) => (
              <li key={i} style={{ fontSize: '13px' }}>{change}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{
        background: 'linear-gradient(135deg, #cc1a1a 0%, #9b1313 100%)',
        color: '#fff',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '15px',
        textAlign: 'center',
      }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>📥 Automatické učení chatu z webu</h2>
        <p style={{ margin: '0 0 12px 0', opacity: 0.9, fontSize: '13px' }}>
          Chat stáhne a naučí se obsah www.rekant.cz (popisy, novinky, FAQ)
        </p>
        <button
          onClick={scanWebsite}
          disabled={loading}
          style={{
            background: '#fff',
            color: '#cc1a1a',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Skenuji...' : '🔄 Aktualizovat znalosti z webu'}
        </button>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
        color: '#fff',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px',
        textAlign: 'center',
      }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>🌐 Synchronizace webu s KB</h2>
        <p style={{ margin: '0 0 12px 0', opacity: 0.9, fontSize: '13px' }}>
          Aktualizuje kontakty (telefony, email) na hlavní stránce rekant.cz
        </p>
        <button
          onClick={syncWebsite}
          disabled={loading}
          style={{
            background: '#fff',
            color: '#16a34a',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Synchronizuji...' : '🌐 Synchronizovat web s KB'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('company')} style={styles.tab(activeTab === 'company')}>Firma</button>
        <button onClick={() => setActiveTab('news')} style={styles.tab(activeTab === 'news')}>Novinky ({kb.news?.length || 0})</button>
        <button onClick={() => setActiveTab('services')} style={styles.tab(activeTab === 'services')}>Sluzby</button>
        <button onClick={() => setActiveTab('products')} style={styles.tab(activeTab === 'products')}>Produkty</button>
        <button onClick={() => setActiveTab('faq')} style={styles.tab(activeTab === 'faq')}>FAQ ({kb.faq?.length || 0})</button>
        <button onClick={() => setActiveTab('preview')} style={styles.tab(activeTab === 'preview')}>Nahled</button>
      </div>

      {activeTab === 'company' && kb.company && (
        <div style={styles.card}>
          <h3>Informace o firme</h3>
          <div style={styles.grid}>
            <div><label style={styles.label}>Nazev firmy</label><input type="text" value={kb.company.name || ''} onChange={(e) => updateCompany('name', e.target.value)} style={styles.input} /></div>
            <div><label style={styles.label}>Slogan</label><input type="text" value={kb.company.tagline || ''} onChange={(e) => updateCompany('tagline', e.target.value)} style={styles.input} /></div>
            <div><label style={styles.label}>Adresa</label><input type="text" value={kb.company.address || ''} onChange={(e) => updateCompany('address', e.target.value)} style={styles.input} /></div>
            <div><label style={styles.label}>Telefon (ustredna)</label><input type="text" value={kb.company.phone || ''} onChange={(e) => updateCompany('phone', e.target.value)} style={styles.input} /></div>
            <div><label style={styles.label}>Telefon (prodejna)</label><input type="text" value={kb.company.phone_shop || ''} onChange={(e) => updateCompany('phone_shop', e.target.value)} style={styles.input} /></div>
            <div><label style={styles.label}>Telefon (servis)</label><input type="text" value={kb.company.phone_service || ''} onChange={(e) => updateCompany('phone_service', e.target.value)} style={styles.input} /></div>
            <div><label style={styles.label}>Email</label><input type="text" value={kb.company.email || ''} onChange={(e) => updateCompany('email', e.target.value)} style={styles.input} /></div>
            <div><label style={styles.label}>Email (servis)</label><input type="text" value={kb.company.email_service || ''} onChange={(e) => updateCompany('email_service', e.target.value)} style={styles.input} /></div>
            <div><label style={styles.label}>Pracovni doba</label><input type="text" value={kb.company.hours || ''} onChange={(e) => updateCompany('hours', e.target.value)} style={styles.input} /></div>
            <div><label style={styles.label}>ICO</label><input type="text" value={kb.company.ico || ''} onChange={(e) => updateCompany('ico', e.target.value)} style={styles.input} /></div>
            <div><label style={styles.label}>DIC</label><input type="text" value={kb.company.vat || ''} onChange={(e) => updateCompany('vat', e.target.value)} style={styles.input} /></div>
            <div><label style={styles.label}>Datova schranka</label><input type="text" value={kb.company.databox || ''} onChange={(e) => updateCompany('databox', e.target.value)} style={styles.input} /></div>
          </div>
          <div><label style={styles.label}>Popis firmy</label><textarea value={kb.company.description || ''} onChange={(e) => updateCompany('description', e.target.value)} style={{ ...styles.input, minHeight: '100px' }} /></div>
        </div>
      )}

      {activeTab === 'news' && (
        <div>
          <div style={styles.card}>
            <h3>Pridat novou novinku</h3>
            <div style={styles.grid}>
              <div>
                <label style={styles.label}>Titulek</label>
                <input
                  type="text"
                  placeholder="Např. Nový produkt..."
                  value={newNews.title}
                  onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Tag</label>
                <select
                  value={newNews.tag}
                  onChange={(e) => setNewNews({ ...newNews, tag: e.target.value })}
                  style={styles.input}
                >
                  <option>Novinka</option>
                  <option>Akce</option>
                  <option>Tip</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Autor</label>
                <input
                  type="text"
                  placeholder="Jméno autora..."
                  value={newNews.author}
                  onChange={(e) => setNewNews({ ...newNews, author: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Datum</label>
                <input
                  type="date"
                  value={newNews.date}
                  onChange={(e) => setNewNews({ ...newNews, date: e.target.value })}
                  style={styles.input}
                />
              </div>
            </div>
            <div>
              <label style={styles.label}>Popis novinky</label>
              <textarea
                placeholder="Podrobný popis..."
                value={newNews.description}
                onChange={(e) => setNewNews({ ...newNews, description: e.target.value })}
                style={{ ...styles.input, minHeight: '80px' }}
              />
            </div>
            <button onClick={addNews} style={{ ...styles.btn, background: '#16a34a', marginTop: '10px' }}>
              Pridat novinku
            </button>
          </div>

          <h3>Existujici novinky ({kb.news?.length || 0})</h3>
          {kb.news?.length === 0 ? (
            <div style={{ ...styles.card, textAlign: 'center', color: '#999' }}>
              Zatim zadne novinky. Vytvoř si první!
            </div>
          ) : (
            kb.news.map((news, idx) => (
              <div key={idx} style={styles.productCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                  <div>
                    <span style={styles.tagBadge(news.tag)}>{news.tag}</span>
                    <span style={{ fontSize: '13px', color: '#999' }}>{news.date}</span>
                  </div>
                  <button onClick={() => deleteNews(idx)} style={styles.btnDanger}>
                    Smazat
                  </button>
                </div>

                <label style={styles.label}>Titulek</label>
                <input
                  type="text"
                  value={news.title}
                  onChange={(e) => updateNews(idx, 'title', e.target.value)}
                  style={{ ...styles.input, marginBottom: '10px' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' }}>
                  <div>
                    <label style={styles.label}>Tag</label>
                    <select
                      value={news.tag}
                      onChange={(e) => updateNews(idx, 'tag', e.target.value)}
                      style={styles.input}
                    >
                      <option>Novinka</option>
                      <option>Akce</option>
                      <option>Tip</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Datum</label>
                    <input
                      type="date"
                      value={news.date}
                      onChange={(e) => updateNews(idx, 'date', e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                <label style={styles.label}>Autor</label>
                <input
                  type="text"
                  value={news.author}
                  onChange={(e) => updateNews(idx, 'author', e.target.value)}
                  style={{ ...styles.input, marginBottom: '10px' }}
                />

                <label style={styles.label}>Popis</label>
                <textarea
                  value={news.description}
                  onChange={(e) => updateNews(idx, 'description', e.target.value)}
                  style={{ ...styles.input, minHeight: '80px' }}
                />
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'services' && kb.services && (
        <div>
          {Object.entries(kb.services).map(([key, service]) => (
            <div key={key} style={styles.productCard}>
              <h3 style={{ marginTop: 0, color: '#cc1a1a' }}>{service.name || key}</h3>
              <div style={styles.grid}>
                <div><label style={styles.label}>Nazev</label><input type="text" value={service.name || ''} onChange={(e) => updateService(key, 'name', e.target.value)} style={styles.input} /></div>
                <div><label style={styles.label}>Znacky (oddelene carkou)</label><input type="text" value={(service.brands || []).join(', ')} onChange={(e) => updateServiceArray(key, 'brands', e.target.value)} style={styles.input} /></div>
              </div>
              <div><label style={styles.label}>Popis sluzby</label><textarea value={service.description || ''} onChange={(e) => updateService(key, 'description', e.target.value)} style={{ ...styles.input, minHeight: '60px' }} /></div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'products' && kb.products && (
        <div>
          {Object.entries(kb.products).map(([key, product]) => (
            <div key={key} style={styles.productCard}>
              <h3 style={{ marginTop: 0, color: '#cc1a1a' }}>{product.name || key}</h3>
              <div style={styles.grid}>
                <div><label style={styles.label}>Nazev produktu</label><input type="text" value={product.name || ''} onChange={(e) => updateProduct(key, 'name', e.target.value)} style={styles.input} /></div>
                <div><label style={styles.label}>Kategorie</label><input type="text" value={product.category || ''} onChange={(e) => updateProduct(key, 'category', e.target.value)} style={styles.input} /></div>
              </div>
              <div><label style={styles.label}>Popis</label><textarea value={product.description || ''} onChange={(e) => updateProduct(key, 'description', e.target.value)} style={{ ...styles.input, minHeight: '60px' }} /></div>
              <div style={{ marginTop: '10px' }}><label style={styles.label}>Funkce (kazda na novem radku)</label><textarea value={(product.features || []).join('\n')} onChange={(e) => updateProductFeatures(key, e.target.value)} style={{ ...styles.input, minHeight: '120px' }} /></div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'faq' && (
        <div style={styles.card}>
          <h3>Pridat nove FAQ</h3>
          <input type="text" placeholder="Otazka..." value={newFaq.q} onChange={(e) => setNewFaq({ ...newFaq, q: e.target.value })} style={{ ...styles.input, marginBottom: '10px' }} />
          <textarea placeholder="Odpoved..." value={newFaq.a} onChange={(e) => setNewFaq({ ...newFaq, a: e.target.value })} style={{ ...styles.input, marginBottom: '10px', minHeight: '80px' }} />
          <button onClick={addFaq} style={{ ...styles.btn, background: '#16a34a' }}>Pridat FAQ</button>

          <h3 style={{ marginTop: '30px' }}>Existujici FAQ ({kb.faq?.length || 0})</h3>
          {kb.faq?.map((item, idx) => (
            <div key={idx} style={{ ...styles.productCard, marginBottom: '15px' }}>
              <label style={styles.label}>Otazka {idx + 1}</label>
              <input type="text" value={item.q} onChange={(e) => updateFaq(idx, 'q', e.target.value)} style={{ ...styles.input, marginBottom: '8px' }} />
              <label style={styles.label}>Odpoved</label>
              <textarea value={item.a} onChange={(e) => updateFaq(idx, 'a', e.target.value)} style={{ ...styles.input, marginBottom: '10px', minHeight: '60px' }} />
              <button onClick={() => deleteFaq(idx)} style={styles.btnDanger}>Smazat</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'preview' && (
        <div style={styles.card}>
          <h3>Nahled KB (JSON)</h3>
          <pre style={{ background: '#f9fafb', padding: '15px', borderRadius: '6px', overflow: 'auto', fontSize: '12px', maxHeight: '600px' }}>{JSON.stringify(kb, null, 2)}</pre>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {hasChanges && (
          <button onClick={saveKB} disabled={loading} style={{ ...styles.btn, background: '#16a34a', padding: '14px 30px', fontSize: '16px' }}>Ulozit vsechny zmeny</button>
        )}
        <button onClick={exportKB} style={styles.btnSecondary}>Stahnout zalohu</button>
      </div>
    </div>
  );
}
