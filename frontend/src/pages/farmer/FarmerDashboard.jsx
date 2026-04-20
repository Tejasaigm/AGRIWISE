import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../context/ProductsContext';
import '../../styles/FarmerDashboard.css';

function StatCard({ icon, label, value, color, delay }) {
  return (
    <div 
      className="agri-card stat-card"
      style={{ 
        animationDelay: `${delay}ms`,
        borderLeft: `5px solid ${color}`
      }}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function MiniProductCard({ product, t }) {
  return (
    <div className="mini-product-card">
      <div className="mini-product-image">
        <img 
          src={product.image || 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400'} 
          alt={product.name} 
        />
      </div>
      <div className="mini-product-info">
        <h4>{product.name}</h4>
        <p className="location">📍 {product.location}</p>
        <div className="price-grade">
          <span className="price">₹{product.price}/kg</span>
          <span className="grade">Grade {product.grade}</span>
        </div>
      </div>
      <div className="mini-product-meta">
        <span>{product.quantity} kg</span>
        {product.delivery && <span className="delivery-tag">🚚</span>}
      </div>
    </div>
  );
}

export default function FarmerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getByFarmer } = useProducts();

  const myProducts = getByFarmer(user?.id || 'demo').slice(0, 4);

  const stats = [
    { 
      icon: '📦', 
      label: t('farmer.totalProducts'), 
      value: myProducts.length || 0, 
      color: '#16a34a', 
      delay: 0 
    },
    { 
      icon: '💰', 
      label: t('farmer.totalSales'), 
      value: '₹0', 
      color: '#3b82f6', 
      delay: 80 
    },
    { 
      icon: '📋', 
      label: t('farmer.activeListings'), 
      value: myProducts.length || 0, 
      color: '#f59e0b', 
      delay: 160 
    },
    { 
      icon: '⏳', 
      label: t('farmer.pendingOrders'), 
      value: 0, 
      color: '#8b5cf6', 
      delay: 240 
    },
  ];

  return (
    <div className="farmer-dashboard-page">
      {/* Background with overlay */}
      <div className="dashboard-bg" />

      <div className="page-content">
        {/* Header */}
        <div className="page-header animate-fadeUp">
          <h1>🌾 Good morning, {user?.name?.split(' ')[0] || 'Farmer'}</h1>
          <p>Here's an overview of your farm today</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {stats.map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))}
        </div>

        <div className="main-grid">
          {/* My Listings Section */}
          <div className="listings-section">
            <div className="section-header">
              <h2>📋 My Recent Listings</h2>
              <Link to="/farmer/products" className="view-all-link">View All →</Link>
            </div>

            <div className="mini-products">
              {myProducts.length > 0 ? (
                myProducts.map((product, i) => (
                  <MiniProductCard key={product.id} product={product} t={t} />
                ))
              ) : (
                <div className="no-products">
                  <div className="no-products-icon">📦</div>
                  <p>You haven't listed any products yet</p>
                  <Link to="/farmer/add" className="btn-primary">Add Your First Product</Link>
                </div>
              )}
            </div>

            <Link to="/farmer/add" className="add-product-btn">
              + Add New Product
            </Link>
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            {/* Weather Card */}
            <div className="weather-card">
              <div className="weather-header">
                <span>📍 Local Weather</span>
                <span className="weather-temp">32°C</span>
              </div>
              <div className="weather-desc">Clear Sky • Ideal for field work</div>
              
              <div className="weather-details">
                <div>💧 Humidity <strong>45%</strong></div>
                <div>🌬️ Wind <strong>8 km/h</strong></div>
                <div>🌧️ Rain <strong>0 mm</strong></div>
              </div>
            </div>
                <br />
                
            {/* Agri Tip */}
            <div className="tip-card">
              <h3>💡 Today's Farming Tip</h3>
              <p>
                Prepare your soil with well-decomposed organic manure 10–15 days before sowing for better nutrient absorption.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}