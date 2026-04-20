// src/pages/farmer/AddProduct.jsx
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../context/ProductsContext';
import { useToast } from '../../context/ToastContext';

const CATEGORIES = ['vegetables','fruits','grains','pulses','spices','oilseeds','other'];
const BASE_PRICES = { tomato:15, potato:18, onion:22, rice:35, wheat:25, maize:22, brinjal:24, banana:32, apple:100, mango:55, grapes:80, cauliflower:60, capsicum:90, groundnut:65, soybean:45, cotton:70 };

function QualitySlider({ label, icon, value, onChange, id }) {
  const pct = ((value - 1) / 9) * 100;
  return (
    <div style={{ background:'var(--gray-bg)', borderRadius:'var(--radius-sm)', padding:16, marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:13, fontWeight:600 }}>{icon} {label}</span>
        <span style={{ background:'rgba(34,197,94,.15)', color:'var(--green-dark)', padding:'4px 12px', borderRadius:50, fontSize:12, fontWeight:700 }}>{value} / 10</span>
      </div>
      <input type="range" min="1" max="10" value={value} onChange={e => onChange(parseInt(e.target.value))}
        style={{ width:'100%', height:5, WebkitAppearance:'none', background:`linear-gradient(to right, var(--green) ${pct}%, var(--border) ${pct}%)`, borderRadius:50, cursor:'pointer', outline:'none' }} />
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-xlight)', marginTop:4 }}>
        <span>Poor</span><span>Excellent</span>
      </div>
    </div>
  );
}

export default function AddProduct() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addProduct } = useProducts();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({ name:'', category:'vegetables', price:'', quantity:'', location:'', description:'', delivery:true, organic:false });
  const [size, setSize]           = useState(7);
  const [color, setColor]         = useState(7);
  const [freshness, setFreshness] = useState(7);
  const [weight, setWeight]       = useState(1);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile]       = useState(null);
  const [loading, setLoading]           = useState(false);
  const [errors, setErrors]             = useState({});

  // Live quality calculation
  const normalizedWeight = Math.min(10, weight * 2);
  const qualityScore = parseFloat((0.3*size + 0.2*color + 0.3*freshness + 0.2*normalizedWeight).toFixed(1));
  const grade = qualityScore >= 8 ? 'A' : qualityScore >= 6 ? 'B' : qualityScore >= 4 ? 'C' : 'D';
  const GRADE_COLORS = { A:['#dcfce7','#16a34a'], B:['#dbeafe','#1e40af'], C:['#fff7ed','#c2410c'], D:['#fee2e2','#dc2626'] };

  // Suggested price from base prices
  const suggestedPrice = (() => {
    const key = form.name.toLowerCase();
    const base = Object.entries(BASE_PRICES).find(([k]) => key.includes(k))?.[1] || 30;
    const mult = { A:1.35, B:1.0, C:0.7, D:0.4 }[grade] || 1;
    return Math.round(base * mult);
  })();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())     e.name = 'Product name is required';
    if (!form.price)           e.price = 'Price is required';
    if (!form.quantity)        e.quantity = 'Quantity is required';
    if (!form.location.trim()) e.location = 'Location is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800)); // Simulate upload

    addProduct({
      ...form,
      price: parseFloat(form.price),
      quantity: parseFloat(form.quantity),
      qualityScore,
      grade,
      farmerId: user?.id || 'demo',
      farmerName: user?.name || 'Farmer',
      image: imagePreview || `https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&q=60`,
    });

    setLoading(false);
    toast(t('farmer.productAdded'), 'success');
    navigate('/farmer/products');
  };

  return (
    <div className="page">
      <div className="page-header animate-fadeUp">
        <h1>+ {t('farmer.addProduct')}</h1>
        <p>Fill in the details below to list your produce on the marketplace.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20, alignItems:'start' }}>
          {/* Left column */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Basic info */}
            <div className="agri-card animate-fadeUp" style={{ padding:24, animationDelay:'60ms' }}>
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:18 }}>📋 Product Details</h3>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-mid)', marginBottom:5 }}>
                    {t('farmer.productName')} <span style={{ color:'var(--red)' }}>*</span>
                  </label>
                  <input value={form.name} onChange={e=>set('name',e.target.value)}
                    placeholder="e.g. Tomato, Wheat, Onion..."
                    className="agri-input" />
                  {errors.name && <p style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>{errors.name}</p>}
                </div>

                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-mid)', marginBottom:5 }}>{t('farmer.category')}</label>
                  <select value={form.category} onChange={e=>set('category',e.target.value)} className="agri-input">
                    {CATEGORIES.map(c => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-mid)', marginBottom:5 }}>
                    {t('farmer.price')} <span style={{ color:'var(--red)' }}>*</span>
                  </label>
                  <div style={{ position:'relative' }}>
                    <input type="number" value={form.price} onChange={e=>set('price',e.target.value)}
                      placeholder={`Suggested: ₹${suggestedPrice}`}
                      className="agri-input" style={{ paddingLeft:28 }} />
                    <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'var(--text-light)' }}>₹</span>
                  </div>
                  {!form.price && <p style={{ fontSize:10, color:'var(--green-dark)', marginTop:3 }}>💡 Suggested: ₹{suggestedPrice}/kg based on grade {grade}</p>}
                  {errors.price && <p style={{ fontSize:11, color:'var(--red)', marginTop:3 }}>{errors.price}</p>}
                </div>

                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-mid)', marginBottom:5 }}>
                    {t('farmer.quantity')} <span style={{ color:'var(--red)' }}>*</span>
                  </label>
                  <input type="number" value={form.quantity} onChange={e=>set('quantity',e.target.value)}
                    placeholder="e.g. 500" className="agri-input" />
                  {errors.quantity && <p style={{ fontSize:11, color:'var(--red)', marginTop:3 }}>{errors.quantity}</p>}
                </div>

                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-mid)', marginBottom:5 }}>
                    {t('farmer.location')} <span style={{ color:'var(--red)' }}>*</span>
                  </label>
                  <input value={form.location} onChange={e=>set('location',e.target.value)}
                    placeholder="e.g. Nizamabad, Telangana" className="agri-input" />
                  {errors.location && <p style={{ fontSize:11, color:'var(--red)', marginTop:3 }}>{errors.location}</p>}
                </div>

                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-mid)', marginBottom:5 }}>{t('farmer.description')}</label>
                  <textarea value={form.description} onChange={e=>set('description',e.target.value)}
                    rows={3} placeholder="Describe your product quality, harvest date, etc."
                    className="agri-input" style={{ resize:'vertical' }} />
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display:'flex', gap:12, marginTop:12 }}>
                {[['delivery',t('farmer.delivery'),'🚚'],['organic',t('farmer.organic'),'🌿']].map(([key,label,ic]) => (
                  <button key={key} type="button" onClick={() => set(key, !form[key])} style={{
                    display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
                    borderRadius:50, border:`1.5px solid ${form[key]?'var(--green)':'var(--border)'}`,
                    background:form[key]?'var(--green-xlight)':'white',
                    color:form[key]?'var(--green-dark)':'var(--text-mid)',
                    fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit', transition:'all .2s',
                  }}>{ic} {label}</button>
                ))}
              </div>
            </div>

            {/* Image upload */}
            <div className="agri-card animate-fadeUp" style={{ padding:24, animationDelay:'120ms' }}>
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>📷 {t('farmer.uploadImage')}</h3>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border:`2px dashed ${imagePreview?'var(--green)':'var(--border)'}`,
                  borderRadius:'var(--radius-sm)', overflow:'hidden',
                  minHeight:160, display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', transition:'all .2s', background:imagePreview?'transparent':'var(--gray-bg)',
                }}
                onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();handleImage({target:{files:e.dataTransfer.files}});}}
              >
                {imagePreview
                  ? <img src={imagePreview} alt="preview" style={{ width:'100%', maxHeight:220, objectFit:'cover', display:'block' }} />
                  : <div style={{ textAlign:'center', padding:24 }}>
                      <div style={{ fontSize:38, marginBottom:8 }}>📷</div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-mid)' }}>Click or drag to upload</div>
                      <div style={{ fontSize:11, color:'var(--text-xlight)', marginTop:3 }}>JPG, PNG, WEBP · Max 5MB</div>
                    </div>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImage} />
            </div>
          </div>

          {/* Right column — quality scorer */}
          <div style={{ position:'sticky', top:78 }}>
            <div className="agri-card animate-fadeUp" style={{ padding:24, animationDelay:'80ms' }}>
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:18 }}>⚙️ Quality Parameters</h3>

              <QualitySlider label="Size Rating"    icon="⚖️" value={size}      onChange={setSize} />
              <QualitySlider label="Color Quality"  icon="🎨" value={color}     onChange={setColor} />
              <QualitySlider label="Freshness"      icon="🌿" value={freshness} onChange={setFreshness} />

              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-mid)', marginBottom:5 }}>Sample Weight (kg)</label>
                <input type="number" value={weight} min="0.1" step="0.1"
                  onChange={e=>setWeight(parseFloat(e.target.value)||1)}
                  className="agri-input" />
              </div>

              {/* Live result card */}
              <div style={{ background:'var(--gray-bg)', borderRadius:'var(--radius-sm)', padding:16 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--text-mid)' }}>Quality Result</span>
                  <span style={{ fontSize:13, fontWeight:800, padding:'4px 12px', borderRadius:50, background:GRADE_COLORS[grade][0], color:GRADE_COLORS[grade][1] }}>
                    {t('farmer.grade')} {grade}
                  </span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  <div style={{ background:'white', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:'var(--text-xlight)', fontWeight:600, textTransform:'uppercase' }}>Score</div>
                    <div style={{ fontSize:22, fontWeight:800 }}>{qualityScore}<span style={{ fontSize:12, color:'var(--text-light)' }}>/10</span></div>
                  </div>
                  <div style={{ background:'white', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:'var(--text-xlight)', fontWeight:600, textTransform:'uppercase' }}>Suggested Price</div>
                    <div style={{ fontSize:22, fontWeight:800, color:'var(--green-dark)' }}>₹{suggestedPrice}</div>
                  </div>
                </div>
                <div className="q-track">
                  <div className="q-fill" style={{ width:`${qualityScore*10}%`, background:GRADE_COLORS[grade][1] }} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary animate-fadeUp"
              style={{ width:'100%', marginTop:14, padding:'14px', borderRadius:'var(--radius-sm)', fontSize:14, justifyContent:'center', animationDelay:'180ms' }}>
              {loading
                ? <><span style={{ width:18,height:18,border:'3px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block' }} /> {t('common.uploading')}</>
                : '🚀 ' + t('farmer.publishListing')
              }
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
