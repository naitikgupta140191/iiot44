import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PageShell from './components/layout/PageShell';
import Overview from './pages/Overview';
import Forecast from './pages/Forecast';
import Market from './pages/Market';
import Simulator from './pages/Simulator';
import Models from './pages/Models';
import Segments from './pages/Segments';
import Filters from './pages/Filters';
import Risk from './pages/Risk';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PageShell />}>
          <Route path="/" element={<Overview />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/market" element={<Market />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/models" element={<Models />} />
          <Route path="/segments" element={<Segments />} />
          <Route path="/filters" element={<Filters />} />
          <Route path="/risk" element={<Risk />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
