import { useEffect, useState, useCallback } from 'react';
import { useSpotifyAuth } from './hooks/useSpotifyAuth';
import { useRecommendations } from './hooks/useRecommendations';
import { useTimeTheme } from './hooks/useTimeTheme';
import { Header } from './components/Header';
import { EmptyState } from './components/EmptyState';
import { LoadingState } from './components/LoadingState';
import { TrackList } from './components/TrackList';

// Demo tracks for when no client ID is configured
const DEMO_TRACKS = [
  {
    id: "1",
    name: "Midnight City",
    artists: [{ name: "M83" }],
    album: { images: [{ url: "https://i.scdn.co/image/ab67616d0000b273c79b600289a80aaef74d155d" }] },
    external_urls: { spotify: "https://open.spotify.com/track/6GyFP1nfCDB8lbD2bG0Hq9" },
    duration_ms: 243000,
    matchReason: "Based on your love of atmospheric synth",
    matchScore: 94,
  },
  {
    id: "2",
    name: "Electric Feel",
    artists: [{ name: "MGMT" }],
    album: { images: [{ url: "https://i.scdn.co/image/ab67616d0000b2738b32b139981e79f2ebe005eb" }] },
    external_urls: { spotify: "https://open.spotify.com/track/3FtYbEfBqAlGO46NUDQSAt" },
    duration_ms: 228000,
    matchReason: "Matches your psychedelic rock taste",
    matchScore: 91,
  },
  {
    id: "3",
    name: "Redbone",
    artists: [{ name: "Childish Gambino" }],
    album: { images: [{ url: "https://i.scdn.co/image/ab67616d0000b273f9f27162ab1ed45b8d7a7e98" }] },
    external_urls: { spotify: "https://open.spotify.com/track/0wXuerDYiBnERgIpbb3JBR" },
    duration_ms: 326000,
    matchReason: "Soul funk vibes you frequently play",
    matchScore: 88,
  },
  {
    id: "4",
    name: "Innerbloom",
    artists: [{ name: "RÜFÜS DU SOL" }],
    album: { images: [{ url: "https://i.scdn.co/image/ab67616d0000b273a0c5ff5f6e42e338431fe82d" }] },
    external_urls: { spotify: "https://open.spotify.com/track/7IC2HMBhhvfQP3UKXNhpks" },
    duration_ms: 578000,
    matchReason: "Deep house journey for late nights",
    matchScore: 86,
  },
  {
    id: "5",
    name: "Dissolve",
    artists: [{ name: "Absofacto" }],
    album: { images: [{ url: "https://i.scdn.co/image/ab67616d0000b273b0a0d86aa3f9a42c8e65f5c9" }] },
    external_urls: { spotify: "https://open.spotify.com/track/1DeYn0jZ9l3W0JF2EpYaQN" },
    duration_ms: 213000,
    matchReason: "Indie electronic hidden gem",
    matchScore: 82,
  },
  {
    id: "6",
    name: "Tame Impala",
    artists: [{ name: "Let It Happen" }],
    album: { images: [{ url: "https://i.scdn.co/image/ab67616d0000b2739e1cfc756886ac782e363d79" }] },
    external_urls: { spotify: "https://open.spotify.com/track/2X485T9Z5Ly0xyaghN73ed" },
    duration_ms: 467000,
    matchReason: "Fresh psychedelic discovery",
    matchScore: 89,
  },
  {
    id: "7",
    name: "The Less I Know The Better",
    artists: [{ name: "Tame Impala" }],
    album: { images: [{ url: "https://i.scdn.co/image/ab67616d0000b2739e1cfc756886ac782e363d79" }] },
    external_urls: { spotify: "https://open.spotify.com/track/6K4t31amVTZDgR3sKmwUJJ" },
    duration_ms: 216000,
    matchReason: "Album cut you might have missed",
    matchScore: 85,
  },
  {
    id: "8",
    name: "Flashing Lights",
    artists: [{ name: "Kanye West" }],
    album: { images: [{ url: "https://i.scdn.co/image/ab67616d0000b273428d2255141c2119409a31b2" }] },
    external_urls: { spotify: "https://open.spotify.com/track/5bxEAzLuhyl5oqLZBRSKiD" },
    duration_ms: 237000,
    matchReason: "Matches your hip hop taste",
    matchScore: 87,
  },
  {
    id: "9",
    name: "Nights",
    artists: [{ name: "Frank Ocean" }],
    album: { images: [{ url: "https://i.scdn.co/image/ab67616d0000b2737c39ed5e3a7a9f3e4e6b2d7a" }] },
    external_urls: { spotify: "https://open.spotify.com/track/7eqoqGkKwgOaWNNHx90uEZ" },
    duration_ms: 309000,
    matchReason: "Deep cut from Frank Ocean",
    matchScore: 92,
  },
  {
    id: "10",
    name: "Breathe",
    artists: [{ name: "Pink Floyd" }],
    album: { images: [{ url: "https://i.scdn.co/image/ab67616d0000b273ea7caaff71dea1051d49b2fe" }] },
    external_urls: { spotify: "https://open.spotify.com/track/2ctvdKmETyOzPb2GiJJT53" },
    duration_ms: 169000,
    matchReason: "Explore Pink Floyd's catalog",
    matchScore: 84,
  },
];

export default function App() {
  const { token, login, isLoading: authLoading, isDemo } = useSpotifyAuth();
  const { 
    tracks, 
    fetchRecommendations, 
    refresh, 
    replaceTrack,
    likeTrack,
    isLoading: recsLoading,
    replacingIndex,
    backupCount
  } = useRecommendations();
  const theme = useTimeTheme();

  // Date filter state
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initial fetch when token is available
  useEffect(() => {
    if (token) {
      fetchRecommendations(token, { filterYear, filterMonth });
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = authLoading || recsLoading;
  const hasResults = tracks.length > 0 || isDemo;
  const displayTracks = isDemo ? DEMO_TRACKS : tracks;

  const handleConnect = () => {
    if (isDemo) {
      return;
    }
    login();
  };

  const handleRefresh = useCallback(() => {
    if (token && !recsLoading) {
      refresh(token, { filterYear, filterMonth });
    }
  }, [token, recsLoading, refresh, filterYear, filterMonth]);

  const handleMonthChange = useCallback((month) => {
    setFilterMonth(month);
    if (token && !recsLoading) {
      refresh(token, { filterYear, filterMonth: month });
    }
  }, [token, recsLoading, refresh, filterYear]);

  const handleYearChange = useCallback((year) => {
    setFilterYear(year);
    if (token && !recsLoading) {
      refresh(token, { filterYear: year, filterMonth });
    }
  }, [token, recsLoading, refresh, filterMonth]);

  const handleDislike = (trackId, index) => {
    replaceTrack(trackId, index);
  };

  const handleLike = (trackId) => {
    likeTrack(trackId);
  };

  return (
    <>
      <div className="gradient-mesh" />
      <div className="grain" />

      <div className="container">
        <Header 
          onConnect={handleConnect} 
          showConnectButton={!hasResults && !isLoading} 
        />

        {isLoading && <LoadingState />}
        
        {!isLoading && !hasResults && (
          <EmptyState onConnect={handleConnect} />
        )}
        
        {!isLoading && hasResults && (
          <TrackList 
            tracks={displayTracks} 
            isDemo={isDemo} 
            onRefresh={handleRefresh}
            isRefreshing={recsLoading}
            onDislike={handleDislike}
            onLike={handleLike}
            replacingIndex={replacingIndex}
            backupCount={backupCount}
            filterMonth={filterMonth}
            filterYear={filterYear}
            onMonthChange={handleMonthChange}
            onYearChange={handleYearChange}
          />
        )}
      </div>
    </>
  );
}
