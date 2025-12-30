// ============== SPOTIFY CONFIG ==============
// Replace with your Spotify Client ID from https://developer.spotify.com/dashboard
export const SPOTIFY_CLIENT_ID = "d1c7ee33d13a4523afd548c054039113";

// Use 127.0.0.1 instead of localhost (Spotify requires this for security)
// If running on a different port, update the redirect URI in your Spotify app
const getRedirectUri = () => {
  // For local development, always use 127.0.0.1
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://127.0.0.1:${window.location.port}${window.location.pathname}`;
  }
  // For production (HTTPS), use the actual origin
  return window.location.origin + window.location.pathname;
};

export const REDIRECT_URI = getRedirectUri();
export const SCOPES = "user-top-read user-read-recently-played user-library-read";

// Log redirect URI for setup
console.log("=== ADD THIS EXACT REDIRECT URI TO YOUR SPOTIFY APP ===");
console.log(REDIRECT_URI);
console.log("========================================================");

