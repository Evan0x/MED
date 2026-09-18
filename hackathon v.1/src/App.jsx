import { useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './Pages/Landing';
import Results from './Pages/Results';
import HealthProfile from './Pages/HealthProfile';
import HealthProfileOverview from './Pages/HealthProfileOverview';
import { AppResetContext } from './AppReset';

// Page state lives inside the pages themselves (search bar in Landing, map
// markers / filters in Results, conversation in HealthChatbot). Bumping
// resetKey remounts the whole routed tree, which clears all of it at once —
// navigation alone would not, since going to "/" while already on "/" keeps
// Landing (and its chatbot) mounted.
const AppShell = () => {
  const [resetKey, setResetKey] = useState(0);
  const resetApp = useCallback(() => setResetKey((k) => k + 1), []);

  return (
    <AppResetContext.Provider value={resetApp}>
      <Routes key={resetKey}>
        <Route path="/" element={<Landing />} />
        <Route path="/results" element={<Results />} />
        <Route path="/profile" element={<HealthProfile />} />
        <Route path="/health-profile/:id" element={<HealthProfileOverview />} />
      </Routes>
    </AppResetContext.Provider>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
};

export default App;
