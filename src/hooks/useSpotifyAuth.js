import { useState, useEffect, useCallback } from 'react';
import { SPOTIFY_CLIENT_ID, REDIRECT_URI, SCOPES } from '../config';

function generateRandomString(len) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let result = "";
  for (let i = 0; i < len; i++) result += chars[arr[i] % chars.length];
  return result;
}

async function sha256(plain) {
  const enc = new TextEncoder();
  return crypto.subtle.digest("SHA-256", enc.encode(plain));
}

function base64encode(buf) {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function useSpotifyAuth() {
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async () => {
    if (SPOTIFY_CLIENT_ID === "YOUR_CLIENT_ID") {
      setError("Please add your Spotify Client ID");
      return;
    }

    const verifier = generateRandomString(64);
    const hash = await sha256(verifier);
    const challenge = base64encode(hash);
    localStorage.setItem("code_verifier", verifier);

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: "S256",
      code_challenge: challenge,
      state: generateRandomString(16),
    });

    window.location.href = "https://accounts.spotify.com/authorize?" + params.toString();
  }, []);

  const exchangeToken = useCallback(async (code) => {
    const verifier = localStorage.getItem("code_verifier");
    if (!verifier) {
      console.error("No code verifier found");
      return null;
    }

    try {
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: SPOTIFY_CLIENT_ID,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: REDIRECT_URI,
          code_verifier: verifier,
        }),
      });

      const data = await res.json();
      localStorage.removeItem("code_verifier");

      if (data.error) {
        console.error("Token error:", data.error, data.error_description);
        setError(data.error_description || data.error);
        return null;
      }

      return data.access_token;
    } catch (e) {
      console.error("Token exchange failed:", e);
      setError(e.message);
      return null;
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      window.history.replaceState({}, "", window.location.pathname);
      setIsLoading(true);

      exchangeToken(code).then((accessToken) => {
        if (accessToken) {
          setToken(accessToken);
        }
        setIsLoading(false);
      });
    }
  }, [exchangeToken]);

  return { token, login, isLoading, error, isDemo: SPOTIFY_CLIENT_ID === "YOUR_CLIENT_ID" };
}

