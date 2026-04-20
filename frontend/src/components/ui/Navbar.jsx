import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

import './../../styles/Navbar.css';

export default function Navbar() {
  const { t } = useTranslation();
  const { user, role, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(true); // Default open on desktop

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  const farmerLinks = [
    { to: '/farmer/dashboard', label: t('nav.dashboard'), icon: '🏠' },
    { to: '/farmer/products', label: t('nav.myProducts'), icon: '📦' },
    { to: '/farmer/add', label: `+ ${t('nav.addProduct')}`, icon: '➕' },
    { to: '/marketplace', label: t('nav.marketplace'), icon: '🛒' },
    { to: '/ai', label: '🤖 AI Tools', icon: '✨', special: true },
  ];

  const buyerLinks = [
    { to: '/buyer/dashboard', label: t('nav.dashboard'), icon: '🏠' },
    { to: '/marketplace', label: t('nav.marketplace'), icon: '🛒' },
    { to: '/ai', label: '🤖 AI Tools', icon: '✨', special: true },
  ];

  const links = role === 'farmer' ? farmerLinks : buyerLinks;
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <>
      {/* Toggle Button */}
      <button 
        className="navbar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle sidebar"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar Navbar */}
      <nav className={`agri-navbar ${isOpen ? 'open' : 'closed'}`}>
        <div className="navbar-inner">
          {/* Logo */}
          <Link 
            to={isAuthenticated ? `/${role}/dashboard` : '/'} 
            className="navbar-logo"
            onClick={() => setIsOpen(false)}
          >
            <div className="logo-icon">🌿</div>
            <span className="logo-text">
              Agri<span className="logo-highlight">Wise</span>
            </span>
          </Link>

          {/* Navigation Links */}
          {isAuthenticated && (
            <div className="navbar-links">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-link ${isActive(link.to) ? 'active' : ''} ${link.special ? 'ai-link' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="nav-icon">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* User Section */}
          <div className="navbar-right">
            <LanguageSwitcher variant="dropdown" />

            {isAuthenticated && (
              <div className="user-section">
                <div className="role-badge">
                  {role === 'farmer' ? '👨‍🌾 Farmer' : '🛒 Buyer'}
                </div>

                <div className="avatar-wrapper" onClick={() => setIsOpen(!isOpen)}>
                  <div className="avatar">
                    {user?.name?.[0]?.toUpperCase() || '👤'}
                  </div>
                </div>

                {/* Dropdown */}
                {isOpen && (
                  <div className="user-dropdown" onClick={() => setIsOpen(false)}>
                    <div className="dropdown-user-info">
                      <div className="user-name">{user?.name}</div>
                      <div className="user-email">{user?.email}</div>
                    </div>
                    <div className="dropdown-divider" />

                    <Link to="/ai" className="dropdown-item ai-dropdown-item">
                      🤖 AI Tools
                    </Link>
                    <div className="dropdown-divider" />
                    <button onClick={handleLogout} className="dropdown-item logout-item">
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}