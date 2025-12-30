import { useState, useEffect } from 'react';

/**
 * Returns 'dark' or 'light' based on EST time of day
 * Dark: 7pm - 7am EST
 * Light: 7am - 7pm EST
 */
export function useTimeTheme() {
  const [theme, setTheme] = useState(() => getThemeForTime());

  useEffect(() => {
    // Update theme immediately
    setTheme(getThemeForTime());
    
    // Check every minute
    const interval = setInterval(() => {
      setTheme(getThemeForTime());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return theme;
}

function getThemeForTime() {
  // Get current time in EST
  const now = new Date();
  const estOptions = { timeZone: 'America/New_York', hour: 'numeric', hour12: false };
  const estHour = parseInt(new Intl.DateTimeFormat('en-US', estOptions).format(now), 10);
  
  // Dark mode from 7pm (19) to 7am (7)
  const isDark = estHour >= 19 || estHour < 7;
  
  return isDark ? 'dark' : 'light';
}

