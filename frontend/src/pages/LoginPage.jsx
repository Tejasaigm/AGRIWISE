// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('farmer');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const from = location.state?.from?.pathname || `/${role}/dashboard`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError(t('common.error')); return; }
    setLoading(true); setError('');
    try {
      await login({ email, password, role });
      toast(t('auth.loginBtn') + ' ' + t('common.success'), 'success');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || t('common.error'));
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* Left */}
      <div style={{ flex:'0 0 400px', background:'linear-gradient(160deg,#0f2027,#203a43,#1a4a2e)', display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
        <div style={{ color:'white' }}>
          <div style={{ fontSize:52, marginBottom:12 }}>🌿</div>
          <h1 style={{ fontSize:34, fontWeight:800, margin:'0 0 6px', letterSpacing:'-0.5px' }}>AgriWise</h1>
          <p style={{ fontSize:13, opacity:.7, lineHeight:1.7, marginBottom:32 }}>
            Precision Agriculture Platform<br/>Connecting Farmers &amp; Buyers
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {['🧪 AI Soil Analysis','🦠 Disease Detection','📈 Market Prices'].map((f,i) => (
              <div key={i} className="animate-slideRight" style={{
                padding:'9px 14px', background:'rgba(255,255,255,.1)',
                borderRadius:9, fontSize:13, fontWeight:600,
                backdropFilter:'blur(8px)', animationDelay:`${i*80}ms`,
              }}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:32, background:'var(--gray-bg)' }}>
        <div className="animate-scaleIn" style={{ background:'white', borderRadius:22, padding:40, width:'100%', maxWidth:420, boxShadow:'var(--shadow-lg)' }}>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:22 }}>
            <LanguageSwitcher variant="dropdown" />
          </div>
          <h2 style={{ fontSize:24, fontWeight:800, margin:'0 0 4px' }}>{t('auth.welcomeBack')}</h2>
          <p style={{ fontSize:13, color:'var(--text-light)', marginBottom:22 }}>{t('auth.loginSubtitle')}</p>

          {/* Role */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:22 }}>
            {['farmer','buyer'].map(r => (
              <button key={r} type="button" onClick={() => setRole(r)} style={{
                display:'flex', alignItems:'center', gap:10, padding:'11px 12px',
                borderRadius:11, border:`2px solid ${role===r?'var(--green)':'var(--border)'}`,
                background:role===r?'var(--green-xlight)':'white',
                cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all .2s',
              }}>
                <span style={{ fontSize:22 }}>{r==='farmer'?'👨‍🌾':'🛒'}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{t(`auth.${r}`)}</div>
                  <div style={{ fontSize:10, color:'var(--text-light)', marginTop:1 }}>{t(`auth.${r}Desc`)}</div>
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {[['auth.email','email',email,setEmail],['auth.password','password',password,setPassword]].map(([lk,type,val,set]) => (
              <div key={lk} style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-mid)', marginBottom:5 }}>{t(lk)}</label>
                <input type={type} required value={val} onChange={e=>set(e.target.value)}
                  placeholder={type==='email'?'you@example.com':'••••••••'}
                  className="agri-input" />
              </div>
            ))}
            {error && <div style={{ background:'#fee2e2', color:'var(--red)', padding:'9px 13px', borderRadius:9, fontSize:12, marginBottom:12 }}>{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', padding:'12px', borderRadius:10, fontSize:14, marginTop:4, justifyContent:'center' }}>
              {loading ? <span style={{ width:18,height:18,border:'3px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block' }} /> : t('auth.loginBtn')}
            </button>
          </form>
          <p style={{ textAlign:'center', fontSize:12, color:'var(--text-light)', marginTop:18 }}>
            {t('auth.noAccount')}{' '}<a href="/register" style={{ color:'var(--green)', fontWeight:700 }}>{t('auth.registerHere')}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
