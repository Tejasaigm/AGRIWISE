// src/pages/buyer/BuyerDashboard.jsx
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../context/ProductsContext';

export default function BuyerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { products } = useProducts();

  const featured = products.filter(p => p.grade === 'A').slice(0, 3);
  const stats = [
    { icon:'🛒', label:t('buyer.totalOrders'),    value:8,     color:'var(--green)' },
    { icon:'❤️', label:t('buyer.savedProducts'),  value:5,     color:'var(--red)' },
    { icon:'📦', label:'Active Enquiries',         value:2,     color:'var(--blue)' },
    { icon:'✅', label:'Completed Orders',          value:6,     color:'var(--purple)' },
  ];

  return (
    <div className="page">
      <div className="page-header animate-fadeUp">
        <h1>🛒 {t('buyer.dashboardTitle')}</h1>
        <p>{t('buyer.welcomeMsg')}</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
        {stats.map((s,i) => (
          <div key={i} className="agri-card card-reveal animate-fadeUp" style={{ padding:20, borderLeft:`4px solid ${s.color}`, animationDelay:`${i*60}ms` }}>
            <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:26, fontWeight:800 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--text-light)', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>
        {/* Featured products */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <h2 style={{ fontSize:16, fontWeight:700 }}>⭐ Top Grade A Products</h2>
            <Link to="/marketplace" style={{ fontSize:12, color:'var(--green)', fontWeight:700 }}>Browse all →</Link>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {featured.map((p, i) => (
              <div key={p.id} className="agri-card card-reveal" style={{ display:'flex', gap:14, padding:16, animationDelay:`${i*60}ms` }}>
                <div className="img-zoom-wrap" style={{ width:72, height:72, borderRadius:10, flexShrink:0, overflow:'hidden' }}>
                  <img src={p.image} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15 }}>{p.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-light)', marginTop:1 }}>📍 {p.location} · {t('buyer.postedBy', { name: p.farmerName })}</div>
                    </div>
                    <span style={{ fontSize:18, fontWeight:800, color:'var(--green-dark)', flexShrink:0 }}>₹{p.price}/kg</span>
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:8, alignItems:'center' }}>
                    <div style={{ flex:1 }}>
                      <div className="q-track" style={{ height:5 }}>
                        <div className="q-fill" style={{ width:`${p.qualityScore*10}%`, background:'var(--green)' }} />
                      </div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, color:'var(--green-dark)', flexShrink:0 }}>{p.qualityScore}/10</span>
                    <Link to="/marketplace" className="btn-primary" style={{ padding:'6px 14px', fontSize:11, flexShrink:0 }}>
                      {t('buyer.contactSeller')}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Search shortcut */}
          <div className="agri-card animate-fadeUp" style={{ padding:18, animationDelay:'80ms' }}>
            <h3 style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>🔍 Quick Search</h3>
            <Link to="/marketplace">
              <div className="agri-input" style={{ cursor:'pointer', color:'var(--text-light)', display:'flex', alignItems:'center', gap:8 }}>
                🔍 {t('buyer.searchPlaceholder')}
              </div>
            </Link>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
              {['Tomato','Onion','Potato','Rice','Wheat'].map(c => (
                <Link key={c} to={`/marketplace?q=${c}`} style={{ padding:'5px 12px', background:'var(--green-xlight)', color:'var(--green-dark)', borderRadius:50, fontSize:11, fontWeight:600 }}>{c}</Link>
              ))}
            </div>
          </div>

          {/* Price alerts */}
          <div className="agri-card animate-fadeUp" style={{ padding:18, animationDelay:'140ms' }}>
            <h3 style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>📊 Price Alerts</h3>
            {[{ name:'Tomato', price:15, change:'+8%', up:true },{ name:'Onion', price:22, change:'-3%', up:false },{ name:'Potato', price:18, change:'+2%', up:true }].map(item => (
              <div key={item.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:13, fontWeight:600 }}>{item.name}</span>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:14, fontWeight:800 }}>₹{item.price}/kg</div>
                  <div style={{ fontSize:10, color:item.up?'var(--green-dark)':'var(--red)', fontWeight:700 }}>{item.change}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div className="agri-card animate-fadeUp" style={{ padding:18, background:'#eff6ff', border:'1px solid #bfdbfe', animationDelay:'200ms' }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:'#1e40af', marginBottom:8 }}>💡 Buying Tip</h3>
            <p style={{ fontSize:12, color:'#1e40af', lineHeight:1.6 }}>Grade A products command 30–35% premium but last 2–3x longer. Check quality score before negotiating price.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
