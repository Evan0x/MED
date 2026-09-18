import { createContext, useContext } from 'react';

// Lets any component (e.g. the header logo) ask the app for a full reset.
// App.jsx supplies the implementation; the default is a no-op so components
// rendered outside the provider stay safe.
export const AppResetContext = createContext(() => {});

export const useAppReset = () => useContext(AppResetContext);
