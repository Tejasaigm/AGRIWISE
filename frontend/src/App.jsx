// src/App.jsx  (UPDATED – drop-in replacement for existing App.jsx)
// Adds AI tools routes: /ai, /ai/soil, /ai/disease, /ai/quality, /ai/weather

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// i18n FIRST
import './i18n/i18n';
import './styles/global.css';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider }         from './context/ToastContext';
import { ProductsProvider }      from './context/ProductsContext';

// Shared
import Navbar         from './components/ui/Navbar';
import ProtectedRoute, { PageLoader } from './components/ui/ProtectedRoute';
import VoiceAssistant from './components/voice/VoiceAssistant';

// ── Lazy pages ────────────────────────────────────────────────────────────────
// Existing
const LoginPage       = lazy(() => import('./pages/LoginPage'));
const FarmerDashboard = lazy(() => import('./pages/farmer/FarmerDashboard'));
const FarmerProducts  = lazy(() => import('./pages/farmer/FarmerProducts'));
const AddProduct      = lazy(() => import('./pages/farmer/AddProduct'));
const BuyerDashboard  = lazy(() => import('./pages/buyer/BuyerDashboard'));
const Marketplace     = lazy(() => import('./pages/Marketplace'));

// NEW – AI tools
const AIToolsHub      = lazy(() => import('./pages/ai-tools/AIToolsHub'));
const SoilAnalysis    = lazy(() => import('./pages/ai-tools/SoilAnalysis'));
const DiseaseDetection = lazy(() => import('./pages/ai-tools/DiseaseDetection'));
const QualityPrice    = lazy(() => import('./pages/ai-tools/QualityPrice'));
const WeatherAdvisory = lazy(() => import('./pages/ai-tools/WeatherAdvisory'));

function AppInner() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <>
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"        element={<Navigate to="/login" replace />} />
          <Route path="/login"   element={<LoginPage />} />

          {/* Farmer */}
          <Route path="/farmer/dashboard" element={<ProtectedRoute role="farmer"><FarmerDashboard /></ProtectedRoute>} />
          <Route path="/farmer/products"  element={<ProtectedRoute role="farmer"><FarmerProducts /></ProtectedRoute>} />
          <Route path="/farmer/add"       element={<ProtectedRoute role="farmer"><AddProduct /></ProtectedRoute>} />

          {/* Buyer */}
          <Route path="/buyer/dashboard"  element={<ProtectedRoute role="buyer"><BuyerDashboard /></ProtectedRoute>} />

          {/* Shared */}
          <Route path="/marketplace" element={<Marketplace />} />

          {/* AI Tools (accessible to both roles) */}
          <Route path="/ai"         element={<ProtectedRoute><AIToolsHub /></ProtectedRoute>} />
          <Route path="/ai/soil"    element={<ProtectedRoute><SoilAnalysis /></ProtectedRoute>} />
          <Route path="/ai/disease" element={<ProtectedRoute><DiseaseDetection /></ProtectedRoute>} />
          <Route path="/ai/quality" element={<ProtectedRoute><QualityPrice /></ProtectedRoute>} />
          <Route path="/ai/weather" element={<ProtectedRoute><WeatherAdvisory /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>

      <VoiceAssistant
        onNavigate={(path) => navigate(path)}
        onLogout={() => { logout(); navigate('/login'); }}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ProductsProvider>
            <AppInner />
          </ProductsProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
