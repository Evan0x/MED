import { useEffect, useState } from 'react';

const QUERY = '(prefers-color-scheme: dark)';

// True while the OS/browser is in dark mode; updates live when it changes.
export const useSystemDarkMode = () => {
  const [isDark, setIsDark] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setIsDark(mq.matches);
    onChange();

    // Safari < 14 only has addListener
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  return isDark;
};

export default useSystemDarkMode;
