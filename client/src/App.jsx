import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/auth';
import Layout from './components/Layout';
import KB from './pages/KB';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import Settings from './pages/Settings';
import AgentDashboard from './pages/AgentDashboard';

export default function App(){
  const { token } = useAuth();
  if (!token) return <Navigate to="/login"/>;

  return (
    <Layout>
      <Routes>
        <Route path="/tickets" element={<TicketList/>} />
        <Route path="/tickets/:id" element={<TicketDetail/>} />
        <Route path="/agent" element={<AgentDashboard/>} />
        <Route path="/kb" element={<KB/>} />
        <Route path="/settings" element={<Settings/>} />
        <Route path="*" element={<Navigate to="/tickets"/>} />
      </Routes>
    </Layout>
  );
}