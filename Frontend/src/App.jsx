import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import ProtectedRoute from './components/common/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import JobListings from './pages/jobs/JobListings';
import JobDetail from './pages/jobs/JobDetail';
import FreelancerDashboard from './pages/dashboard/FreelancerDashboard';
import ClientDashboard from './pages/dashboard/ClientDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import Profile from './pages/profile/Profile';
import FreelancerListings from './pages/freelancers/FreelancerListings';
import AdminPanel from './pages/admin/AdminPanel';
import Orders from './pages/orders/Orders';
import OrderDetail from './pages/orders/OrderDetail';
import DisputeDetail from './pages/disputes/DisputeDetail';
import NotFound from './pages/NotFound';

const DashboardRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'freelancer') return <FreelancerDashboard />;
  if (user?.role === 'client') return <ClientDashboard />;
  if (user?.role === 'admin') return <AdminDashboard />;
  return <Navigate to="/" replace />;
};

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="pane">
        <TopBar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/jobs" element={<JobListings />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/freelancers" element={<FreelancerListings />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/disputes/:id"
            element={
              <ProtectedRoute>
                <DisputeDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}
