// src/components/ui/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function PageLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'calc(100vh - 62px)', flexDirection:'column', gap:14 }}>
      <div style={{ width:44, height:44, border:'4px solid var(--green-light)', borderTopColor:'var(--green)', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
      <p style={{ color:'var(--text-light)', fontSize:14 }}>Loading...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, role: userRole, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (role && userRole !== role) return <Navigate to={`/${userRole}/dashboard`} replace />;
  return children;
}
