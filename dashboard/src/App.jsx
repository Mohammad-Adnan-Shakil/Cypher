import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Hero from './components/Hero';
import DashboardLayout from './pages/DashboardLayout';
import StatsPage from './pages/StatsPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="stats" replace />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="opportunities" element={<PlaceholderPage title="Opportunities" />} />
          <Route path="outreach" element={<PlaceholderPage title="Outreach" />} />
          <Route path="hackathons" element={<PlaceholderPage title="Hackathons" />} />
          <Route path="memory" element={<PlaceholderPage title="Memory" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
