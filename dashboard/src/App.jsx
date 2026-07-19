import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Hero from './components/Hero';
import DashboardLayout from './pages/DashboardLayout';
import StatsPage from './pages/StatsPage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import OutreachPage from './pages/OutreachPage';
import MemoryPage from './pages/MemoryPage';
import HackathonsPage from './pages/HackathonsPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="stats" replace />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="opportunities" element={<OpportunitiesPage />} />
          <Route path="outreach" element={<OutreachPage />} />
          <Route path="hackathons" element={<HackathonsPage />} />
          <Route path="memory" element={<MemoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
