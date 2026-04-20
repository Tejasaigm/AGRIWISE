import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts } from '../context/ProductsContext';

const GRADE_STYLES = {
  A: { bg: '#dcfce7', color: '#16a34a' },
  B: { bg: '#dbeafe', color: '#1e40af' },
  C: { bg: '#fff7ed', color: '#c2410c' },
  D: { bg: '#fee2e2', color: '#dc2626' },
};

function ContactModal({ product, onClose, t }) {
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSend = () => {
    if (!msg.trim()) return;
    setSent(true);
    setTimeout(onClose, 1800);
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0,0,0,.45)', 
        zIndex: 600, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 20 
      }} 
      onClick={onClose}
    >
      <div 
        style={{ 
          background: 'white', 
          borderRadius: 20, 
          padding: 28, 
          maxWidth: 400, 
          width: '100%', 
          boxShadow: 'var(--shadow-lg)', 
          animation: 'modalPop 0.4s cubic-bezier(0.34,1.56,0.64,1)' 
        }} 
        onClick={e => e.stopPropagation()}
      >
        {sent ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 62, marginBottom: 16, animation: 'popIn 0.5s ease' }}>✅</div>
            <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>Message Sent!</h3>
            <p style={{ fontSize: 14, color: 'var(--text-light)' }}>The seller will contact you shortly.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
              <img 
                src={product.image} 
                alt={product.name} 
                style={{ 
                  width: 64, 
                  height: 64, 
                  borderRadius: 12, 
                  objectFit: 'cover',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }} 
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{product.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 2 }}>
                  by {product.farmerName} · {product.location}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green-dark)', marginTop: 4 }}>
                  ₹{product.price}/kg
                </div>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 8 }}>
              Your Message
            </label>
            <textarea 
              rows={4} 
              value={msg} 
              onChange={e => setMsg(e.target.value)}
              placeholder={`Hi, I'm interested in your ${product.name}. Is it still available?`}
              className="agri-input" 
              style={{ resize: 'none', marginBottom: 16 }} 
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={onClose} 
                className="btn-outline" 
                style={{ flex: 1, padding: '12px' }}
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleSend} 
                className="btn-primary" 
                style={{ flex: 2, padding: '12px' }}
              >
                📩 Send Message
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { t } = useTranslation();
  const { products } = useProducts();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [grade, setGrade] = useState('');
  const [sort, setSort] = useState('newest');
  const [delivery, setDelivery] = useState(false);
  const [organic, setOrganic] = useState(false);
  const [contact, setContact] = useState(null);
  const [view, setView] = useState('grid');

  const filtered = useMemo(() => {
    let list = [...products];
    if (search)   list = list.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.location.toLowerCase().includes(search.toLowerCase()) || 
      p.farmerName?.toLowerCase().includes(search.toLowerCase())
    );
    if (category) list = list.filter(p => p.category === category);
    if (grade)    list = list.filter(p => p.grade === grade);
    if (delivery) list = list.filter(p => p.delivery);
    if (organic)  list = list.filter(p => p.organic);

    switch (sort) {
      case 'priceAsc':  list.sort((a,b) => a.price - b.price); break;
      case 'priceDesc': list.sort((a,b) => b.price - a.price); break;
      case 'quality':   list.sort((a,b) => b.qualityScore - a.qualityScore); break;
      default:          list.sort((a,b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [products, search, category, grade, sort, delivery, organic]);

  const CATEGORIES = ['vegetables','fruits','grains','pulses','spices','oilseeds','other'];

  return (
    <div className="page">
      <div className="page-header animate-fadeUp">
        <h1>🛒 {t('nav.marketplace')}</h1>
        <p>{t('buyer.welcomeMsg')} <strong>{filtered.length}</strong> products found.</p>
      </div>

      {/* Search + Sort Bar */}
      <div className="animate-fadeUp" style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center', animationDelay:'80ms' }}>
        <input 
          value={search} 
          onChange={e=>setSearch(e.target.value)}
          placeholder={`🔍 ${t('buyer.searchPlaceholder')}`}
          className="agri-input" 
          style={{ flex:'1 1 260px', minWidth:200 }} 
        />
        
        <select value={sort} onChange={e=>setSort(e.target.value)} className="agri-input" style={{ width:'auto' }}>
          <option value="newest">{t('buyer.newest')}</option>
          <option value="priceAsc">{t('buyer.priceAsc')}</option>
          <option value="priceDesc">{t('buyer.priceDesc')}</option>
          <option value="quality">Quality: High to Low</option>
        </select>

        <div style={{ display:'flex', gap:4, background:'white', borderRadius:10, padding:4, border:'1.5px solid var(--border)' }}>
          {[['grid','⊞'],['list','☰']].map(([v,ic]) => (
            <button 
              key={v} 
              onClick={() => setView(v)} 
              style={{ 
                width:36, 
                height:36, 
                borderRadius:8, 
                border:'none', 
                background: view===v ? 'var(--green)' : 'transparent', 
                color: view===v ? 'white' : 'var(--text-light)', 
                cursor:'pointer', 
                fontSize:16, 
                transition:'all .25s cubic-bezier(0.4,0,0.2,1)',
                transform: view===v ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="animate-fadeUp" style={{ display:'flex', gap:10, marginBottom:28, flexWrap:'wrap', animationDelay:'140ms' }}>
        <select value={category} onChange={e=>setCategory(e.target.value)} className="agri-input" style={{ width:'auto' }}>
          <option value="">{t('buyer.allCategories')}</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
        </select>

        {['A','B','C'].map(g => (
          <button 
            key={g} 
            onClick={() => setGrade(grade===g?'':g)} 
            style={{ 
              padding:'9px 16px', 
              borderRadius:50, 
              fontSize:13, 
              fontWeight:700, 
              cursor:'pointer', 
              transition:'all .3s ease',
              background: grade===g ? GRADE_STYLES[g].bg : 'white', 
              color: grade===g ? GRADE_STYLES[g].color : 'var(--text-mid)', 
              border: `1.5px solid ${grade===g ? GRADE_STYLES[g].color : 'var(--border)'}` 
            }}
          >
            Grade {g}
          </button>
        ))}

        {[['delivery','🚚 Delivery',delivery,setDelivery],['organic','🌿 Organic',organic,setOrganic]].map(([key,label,val,set]) => (
          <button 
            key={key} 
            onClick={() => set(!val)} 
            style={{ 
              padding:'9px 16px', 
              borderRadius:50, 
              fontSize:13, 
              fontWeight:700, 
              cursor:'pointer', 
              transition:'all .3s ease',
              background: val ? 'var(--green-xlight)' : 'white', 
              color: val ? 'var(--green-dark)' : 'var(--text-mid)', 
              border: `1.5px solid ${val ? 'var(--green)' : 'var(--border)'}` 
            }}
          >
            {label}
          </button>
        ))}

        {(search||category||grade||delivery||organic) && (
          <button 
            onClick={() => { setSearch(''); setCategory(''); setGrade(''); setDelivery(false); setOrganic(false); }} 
            className="btn-outline" 
            style={{ padding:'9px 16px', fontSize:13 }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div style={{ background:'white', borderRadius:'var(--radius)', padding:80, textAlign:'center' }}>
          <div style={{ fontSize:68, marginBottom:20, opacity:0.6 }}>🔍</div>
          <p style={{ color:'var(--text-light)', fontSize:16 }}>{t('buyer.noResults')}</p>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:20 }}>
          {filtered.map((p, i) => (
            <div 
              key={p.id} 
              className="agri-card card-reveal" 
              style={{ 
                overflow:'hidden', 
                animationDelay: `${Math.min(i,8)*60}ms`,
                transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1), box-shadow 0.4s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-12px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="img-zoom-wrap" style={{ height:190, overflow:'hidden' }}>
                <img 
                  src={p.image || 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&q=60'} 
                  alt={p.name} 
                  style={{ 
                    height:'100%', 
                    width:'100%', 
                    objectFit:'cover',
                    transition: 'transform 0.6s ease'
                  }} 
                />
              </div>

              <div style={{ padding:18 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:17 }}>{p.name}</div>
                    <div style={{ fontSize:12.5, color:'var(--text-light)', marginTop:2 }}>📍 {p.location}</div>
                  </div>
                  <span style={{ 
                    fontSize:12, 
                    fontWeight:800, 
                    padding:'4px 11px', 
                    borderRadius:50, 
                    background: GRADE_STYLES[p.grade]?.bg, 
                    color: GRADE_STYLES[p.grade]?.color 
                  }}>
                    Grade {p.grade}
                  </span>
                </div>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <span style={{ fontSize:22, fontWeight:800, color:'var(--green-dark)' }}>₹{p.price}/kg</span>
                  <span style={{ fontSize:13, color:'var(--text-light)' }}>{p.quantity} kg</span>
                </div>

                <div style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, color:'var(--text-light)', marginBottom:5 }}>
                    <span>Quality Score</span>
                    <span style={{ fontWeight:700, color:'var(--green-dark)' }}>{p.qualityScore}/10</span>
                  </div>
                  <div className="q-track">
                    <div 
                      className="q-fill" 
                      style={{ 
                        width: `${p.qualityScore * 10}%`, 
                        background: 'var(--green)',
                        transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)'
                      }} 
                    />
                  </div>
                </div>

                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
                  {p.organic && <span className="tag">🌿 Organic</span>}
                  <span className={`tag ${p.delivery ? 'delivery' : ''}`}>
                    {p.delivery ? '🚚 Delivery' : 'Pickup Only'}
                  </span>
                </div>

                <button 
                  onClick={() => setContact(p)} 
                  className="btn-primary" 
                  style={{ width:'100%', padding:'13px', fontSize:15 }}
                >
                  📞 Contact Seller
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filtered.map((p, i) => (
            <div 
              key={p.id} 
              className="agri-card card-reveal" 
              style={{ 
                display:'flex', 
                gap:20, 
                padding:18, 
                alignItems:'center', 
                animationDelay: `${Math.min(i,8)*50}ms` 
              }}
            >
              <div className="img-zoom-wrap" style={{ width:90, height:90, borderRadius:14, flexShrink:0, overflow:'hidden' }}>
                <img src={p.image} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              </div>

              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontWeight:800, fontSize:16.5 }}>{p.name}</span>
                  <span style={{ fontSize:11, fontWeight:800, padding:'3px 9px', borderRadius:50, background:GRADE_STYLES[p.grade]?.bg, color:GRADE_STYLES[p.grade]?.color }}>
                    Grade {p.grade}
                  </span>
                </div>
                <div style={{ fontSize:13, color:'var(--text-light)' }}>📍 {p.location} · {p.farmerName}</div>

                <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:12 }}>
                  <div className="q-track" style={{ width:100 }}>
                    <div className="q-fill" style={{ width:`${p.qualityScore*10}%` }} />
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--green-dark)' }}>{p.qualityScore}/10</span>
                </div>
              </div>

              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:21, fontWeight:800, color:'var(--green-dark)' }}>₹{p.price}/kg</div>
                <div style={{ fontSize:12.5, color:'var(--text-light)' }}>{p.quantity} kg</div>
                <button 
                  onClick={() => setContact(p)} 
                  className="btn-primary" 
                  style={{ marginTop:10, padding:'10px 20px', fontSize:14 }}
                >
                  Contact
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {contact && <ContactModal product={contact} onClose={() => setContact(null)} t={t} />}
    </div>
  );
}