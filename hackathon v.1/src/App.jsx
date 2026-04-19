import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './Pages/Landing';
import Results from './Pages/Results';
import HealthProfile from './Pages/HealthProfile';
import HealthProfileOverview from './Pages/HealthProfileOverview';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/results" element={<Results />} />
        <Route path="/profile" element={<HealthProfile />} />
        <Route path="/health-profile/:id" element={<HealthProfileOverview />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;