// src/components/ui/LanguageSwitcher.jsx
import { useState, useRef, useEffect } from 'react';
import { useLanguage, LANGUAGES } from '../../hooks/useLanguage';

export default function LanguageSwitcher({ variant = 'dropdown', style = {} }) {
  const { currentLang, changeLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  if (variant === 'pills') return (
    <div style={{ display: 'flex', gap: 8, ...style }}>
      {LANGUAGES.map(l => (
        <button key={l.code} onClick={() => changeLanguage(l.code)} style={{
          padding: '7px 14px', borderRadius: 50, fontFamily: 'inherit',
          border: `2px solid ${l.code===currentLang.code?'var(--green)':'var(--border)'}`,
          background: l.code===currentLang.code?'var(--green)':'white',
          color: l.code===currentLang.code?'white':'var(--text-mid)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>{l.flag} {l.label}</button>
      ))}
    </div>
  );

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button onClick={() => setOpen(o=>!o)} style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '7px 13px', borderRadius: 50, border: '1.5px solid var(--border)',
        background: 'white', cursor: 'pointer', fontSize: 13,
        fontFamily: 'inherit', fontWeight: 600, transition: 'border-color .2s',
      }}>
        {currentLang.flag} {currentLang.label}
        <span style={{ fontSize: 9, opacity: .5 }}>{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 7px)', right: 0,
          background: 'white', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,.12)', border: '1px solid var(--border)',
          minWidth: 158, zIndex: 9999, overflow: 'hidden',
          animation: 'langFadeDown .18s ease',
        }}>
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={() => { changeLanguage(l.code); setOpen(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', width: '100%',
              background: l.code===currentLang.code?'var(--green-xlight)':'transparent',
              border: 'none', cursor: 'pointer', fontSize: 13,
              fontFamily: 'inherit', color: 'var(--text)',
              fontWeight: l.code===currentLang.code?700:400, transition: 'background .15s',
            }}>
              {l.flag} {l.label}
              {l.code===currentLang.code && <span style={{ marginLeft: 'auto', color: 'var(--green)' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
