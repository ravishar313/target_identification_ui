/**
 * Initialize dark mode detection and toggling
 */
export const initDarkMode = () => {
  // Check if system prefers dark mode
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Check for stored preference
  const storedDarkMode = localStorage.getItem('darkMode') === 'true';
  
  // Set initial mode based on stored preference, or system preference
  const initialDarkMode = localStorage.getItem('darkMode') !== null
    ? storedDarkMode
    : prefersDarkMode;
    
  // Apply initial dark mode
  document.documentElement.classList.toggle('dark', initialDarkMode);
  
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only update if there's no stored preference
    if (localStorage.getItem('darkMode') === null) {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
};

/**
 * Toggle dark mode
 */
export const toggleDarkMode = () => {
  const isDark = document.documentElement.classList.contains('dark');
  document.documentElement.classList.toggle('dark', !isDark);
  localStorage.setItem('darkMode', (!isDark).toString());
  return !isDark;
};

/**
 * Get current dark mode status
 */
export const isDarkMode = () => {
  return document.documentElement.classList.contains('dark');
}; 