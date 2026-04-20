// src/pages/farmer/FarmerProducts.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../context/ProductsContext';
import { useToast } from '../../context/ToastContext';

const GRADE_COLORS = { A:['#dcfce7','#16a34a'], B:['#dbeafe','#1e40af'], C:['#fff7ed','#c2410c'], D:['#fee2e2','#dc2626'] };

export default function FarmerProducts() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { products, deleteProduct, getByFarmer } = useProducts();
  const toast = useToast();
  const [search, setSearch]       = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [filter, setFilter]       = useState('all');

  // Show all seed products + user's own products
  const allProducts = [
    ...products.filter(p => p.farmerId === (user?.id || 'demo')),
    ...products.filter(p => !['demo','demo2','demo3','demo4','demo5','demo6'].includes(p.farmerId) && p.farmerId !== user?.id),
  ].slice(0, 20);

  const filtered = allProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.grade === filter;
    return matchSearch && matchFilter;
  });

  const handleDelete = (id) => {
    deleteProduct(id);
    setConfirmId(null);
    toast(t('farmer.productDeleted'), 'success');
  };

  const QualityBar = ({ score }) => {
    const color = score >= 8 ? 'var(--green)' : score >= 6 ? 'var(--blue)' : 'var(--orange)';
    return (
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-light)', marginBottom:3 }}>
          <span>{t('farmer.qualityScore')}</span><span style={{ fontWeight:700 }}>{score}/10</span>
        </div>
        <div className="q-track"><div className="q-fill" style={{ width:`${score*10}%`, background:color }} /></div>
      </div>
    );
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header animate-fadeUp" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1>📋 {t('farmer.myListings')}</h1>
          <p>{filtered.length} products listed</p>
        </div>
        <Link to="/farmer/add" className="btn-primary">+ {t('farmer.addProduct')}</Link>
      </div>

      {/* Filters */}
      <div className="animate-fadeUp" style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', animationDelay:'60ms' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder={`🔍 ${t('common.search')}...`}
          className="agri-input" style={{ maxWidth:240 }} />
        {['all','A','B','C'].map(g => (
          <button key={g} onClick={() => setFilter(g)} style={{
            padding:'9px 16px', borderRadius:50, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .2s',
            background: filter===g?'var(--green)':'white',
            color: filter===g?'white':'var(--text-mid)',
            border: `1.5px solid ${filter===g?'var(--green)':'var(--border)'}`,
          }}>{g==='all'?t('common.all'):`${t('farmer.grade')} ${g}`}</button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ background:'white', borderRadius:'var(--radius)', padding:48, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📦</div>
          <p style={{ color:'var(--text-light)', fontSize:14 }}>{t('farmer.noProducts')}</p>
          <Link to="/farmer/add" className="btn-primary" style={{ display:'inline-flex', marginTop:16 }}>+ {t('farmer.addProduct')}</Link>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
          {filtered.map((p, i) => (
            <div key={p.id} className="agri-card card-reveal" style={{ overflow:'hidden', animationDelay:`${i*55}ms` }}>
              <div className="img-zoom-wrap" style={{ height:170 }}>
                <img src={p.image || 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&q=60'} alt={p.name} style={{ height:'100%', objectFit:'cover' }} />
              </div>
              <div style={{ padding:16 }}>
                {/* Top row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:16 }}>{p.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-light)', marginTop:1 }}>📍 {p.location}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:50, background:GRADE_COLORS[p.grade]?.[0]||'#f3f4f6', color:GRADE_COLORS[p.grade]?.[1]||'#374151' }}>
                    {t('farmer.grade')} {p.grade}
                  </span>
                </div>

                {/* Price + qty */}
                <div style={{ display:'flex', gap:12, marginBottom:10 }}>
                  <span style={{ fontSize:20, fontWeight:800, color:'var(--green-dark)' }}>₹{p.price}/kg</span>
                  <span style={{ fontSize:12, color:'var(--text-light)', alignSelf:'flex-end', marginBottom:1 }}>{p.quantity} kg</span>
                </div>

                {/* Quality bar */}
                <div style={{ marginBottom:12 }}><QualityBar score={p.qualityScore} /></div>

                {/* Tags */}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                  {p.organic && <span style={{ fontSize:10, padding:'3px 8px', borderRadius:50, background:'#f0fdf4', color:'var(--green-dark)', fontWeight:700 }}>🌿 Organic</span>}
                  <span style={{ fontSize:10, padding:'3px 8px', borderRadius:50, background:p.delivery?'#dbeafe':'#f3f4f6', color:p.delivery?'#1e40af':'var(--text-light)', fontWeight:600 }}>
                    {p.delivery ? '🚚 ' + t('farmer.delivery') : '🏪 ' + t('farmer.pickup')}
                  </span>
                  <span style={{ fontSize:10, padding:'3px 8px', borderRadius:50, background:'#f3f4f6', color:'var(--text-light)', fontWeight:600 }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:8 }}>
                  <Link to={`/farmer/add?edit=${p.id}`} className="btn-outline" style={{ flex:1, justifyContent:'center', padding:'9px' }}>
                    ✏️ {t('farmer.editProduct')}
                  </Link>
                  <button onClick={() => setConfirmId(p.id)} className="btn-danger" style={{ padding:'9px 14px' }}>
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setConfirmId(null)}>
          <div style={{ background:'white', borderRadius:18, padding:32, maxWidth:360, width:'90%', textAlign:'center', boxShadow:'var(--shadow-lg)', animation:'scaleIn .22s ease' }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:44, marginBottom:12 }}>🗑️</div>
            <h3 style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>{t('farmer.confirmDelete')}</h3>
            <p style={{ fontSize:13, color:'var(--text-light)', marginBottom:24 }}>This action cannot be undone.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={() => setConfirmId(null)} className="btn-outline" style={{ padding:'10px 24px' }}>{t('common.cancel')}</button>
              <button onClick={() => handleDelete(confirmId)} className="btn-danger" style={{ padding:'10px 24px' }}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
