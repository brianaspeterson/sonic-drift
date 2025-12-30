import { useState, useCallback, useRef } from 'react';

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

async function handleApiResponse(r, endpoint) {
  if (!r.ok) {
    const text = await r.text();
    console.error(`API error for ${endpoint}:`, r.status, text);
    throw new Error(`Spotify API error (${r.status}): ${text || "Unknown error"}`);
  }
  return r.json();
}

/**
 * Build a year filter string for Spotify search
 */
function buildYearFilter(filterYear) {
  if (filterYear) {
    return `year:${filterYear}`;
  }
  const currentYear = new Date().getFullYear();
  return `year:${currentYear - 2}-${currentYear}`;
}

/**
 * Check if a track's release date matches the filter
 */
function matchesDateFilter(track, filterYear, filterMonth) {
  if (!filterYear && !filterMonth) return true;
  
  const releaseDate = track.album?.release_date;
  if (!releaseDate) return !filterYear && !filterMonth;
  
  const [year, month] = releaseDate.split('-');
  
  if (filterYear && year !== filterYear) return false;
  if (filterMonth && month && month !== filterMonth) return false;
  if (filterMonth && !month) return true; // Year-only precision, include it
  
  return true;
}

export function useRecommendations() {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState(null);
  const [error, setError] = useState(null);
  
  const refreshCount = useRef(0);
  const userDataRef = useRef(null);
  const backupTracksRef = useRef([]);
  const rejectedTrackIds = useRef(new Set());
  const likedTrackIds = useRef(new Set());
  const currentFilterRef = useRef({ year: '', month: '' });

  const fetchRecommendations = useCallback(async (token, options = {}) => {
    const { forceRefresh = false, filterYear = '', filterMonth = '' } = options;
    
    currentFilterRef.current = { year: filterYear, month: filterMonth };
    
    setIsLoading(true);
    setError(null);

    const headers = { Authorization: `Bearer ${token}` };
    
    const seed = Date.now() + refreshCount.current * 1000;
    refreshCount.current += 1;
    const rand = seededRandom(seed);

    try {
      let userData = userDataRef.current;
      
      if (!userData || forceRefresh) {
        const [topArtists, topTracksMedium, topTracksShort, recentlyPlayed, savedTracks] = await Promise.all([
          fetch("https://api.spotify.com/v1/me/top/artists?limit=20&time_range=medium_term", { headers })
            .then(r => handleApiResponse(r, "top/artists")),
          fetch("https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term", { headers })
            .then(r => handleApiResponse(r, "top/tracks")),
          fetch("https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=short_term", { headers })
            .then(r => handleApiResponse(r, "top/tracks-short"))
            .catch(() => ({ items: [] })),
          fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", { headers })
            .then(r => handleApiResponse(r, "recently-played"))
            .catch(() => ({ items: [] })),
          fetch("https://api.spotify.com/v1/me/tracks?limit=50", { headers })
            .then(r => handleApiResponse(r, "saved-tracks"))
            .catch(() => ({ items: [] })),
        ]);

        const knownTrackIds = new Set();
        const knownArtistIds = new Set();

        (topTracksMedium.items || []).forEach(t => {
          knownTrackIds.add(t.id);
          t.artists.forEach(a => knownArtistIds.add(a.id));
        });
        (topTracksShort.items || []).forEach(t => knownTrackIds.add(t.id));
        (recentlyPlayed.items || []).forEach(item => {
          if (item.track) knownTrackIds.add(item.track.id);
        });
        (savedTracks.items || []).forEach(item => {
          if (item.track) knownTrackIds.add(item.track.id);
        });

        const allGenres = [];
        (topArtists.items || []).forEach(a => {
          knownArtistIds.add(a.id);
          allGenres.push(...(a.genres || []));
        });

        userData = {
          topArtists: topArtists.items || [],
          knownTrackIds,
          knownArtistIds,
          allGenres: [...new Set(allGenres)],
        };
        userDataRef.current = userData;
        
        console.log(`Filtering out ${knownTrackIds.size} known tracks and ${knownArtistIds.size} known artists`);
      }

      const { topArtists, knownTrackIds, knownArtistIds, allGenres } = userData;
      const excludeTrackIds = new Set([...knownTrackIds, ...rejectedTrackIds.current]);
      
      // Use ALL genres and shuffle them
      const shuffledGenres = [...allGenres]
        .sort((a, b) => b.length - a.length)
        .slice(0, 20) // Use more genres
        .sort(() => rand() - 0.5);

      const artists = [...topArtists].sort(() => rand() - 0.5);
      const yearFilter = buildYearFilter(filterYear);
      const hasDateFilter = !!filterYear || !!filterMonth;
      
      // For older years, relax popularity constraints
      const yearNum = filterYear ? parseInt(filterYear) : new Date().getFullYear();
      const isOlderMusic = yearNum < 2010;
      const minPopularity = isOlderMusic ? 5 : 15;
      const maxPopularity = isOlderMusic ? 70 : 55;

      // Search more genres when filtering by date
      const searchGenres = shuffledGenres.length > 0 
        ? shuffledGenres.slice(0, hasDateFilter ? 12 : 8)
        : ["indie pop", "alternative r&b", "art pop", "indie rock", "soul", "funk", "rock", "electronic"];

      console.log("Searching genres:", searchGenres, "with year filter:", yearFilter);

      // Create multiple search queries per genre with different offsets
      const searchPromises = [];
      for (const genre of searchGenres) {
        // Use multiple offsets to find more variety
        const offsets = hasDateFilter ? [0, 20, 50] : [Math.floor(rand() * 80)];
        for (const offset of offsets) {
          searchPromises.push(
            (async () => {
              try {
                const query = encodeURIComponent(`genre:"${genre}" ${yearFilter}`);
                const data = await fetch(
                  `https://api.spotify.com/v1/search?q=${query}&type=track&limit=30&offset=${offset}&market=US`,
                  { headers }
                ).then(r => handleApiResponse(r, "search"));
                
                const filteredTracks = (data.tracks?.items || []).filter(track => {
                  const pop = track.popularity;
                  const isUnknownArtist = !track.artists.some(a => knownArtistIds.has(a.id));
                  const isLegitimate = pop >= minPopularity && pop <= maxPopularity;
                  const notExcluded = !excludeTrackIds.has(track.id);
                  const matchesDate = matchesDateFilter(track, filterYear, filterMonth);
                  return isUnknownArtist && isLegitimate && notExcluded && matchesDate;
                });
                
                return { genre, tracks: filteredTracks, source: "genre" };
              } catch {
                return { genre, tracks: [], source: "genre" };
              }
            })()
          );
        }
      }

      const genreResults = await Promise.all(searchPromises);

      // For album search, check more artists when filtering
      const artistCount = hasDateFilter ? 10 : 6;
      const albumResults = await Promise.all(
        artists.slice(0, artistCount).map(async artist => {
          try {
            const albumData = await fetch(
              `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album&limit=30`,
              { headers }
            ).then(r => handleApiResponse(r, "artist-albums"));

            let albums = (albumData.items || []);
            if (filterYear) {
              albums = albums.filter(album => {
                const releaseYear = album.release_date?.split('-')[0];
                return releaseYear === filterYear;
              });
            }
            
            // Pick multiple albums when filtering
            albums = albums.sort(() => rand() - 0.5);
            const selectedAlbums = albums.slice(0, hasDateFilter ? 3 : 1);
            
            const allDeepCuts = [];
            for (const album of selectedAlbums) {
              if (!album) continue;
              
              const trackData = await fetch(
                `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=20`,
                { headers }
              ).then(r => handleApiResponse(r, "album-tracks"));

              const trackIds = (trackData.items || []).map(t => t.id).join(',');
              if (!trackIds) continue;
              
              const fullTracks = await fetch(
                `https://api.spotify.com/v1/tracks?ids=${trackIds}`,
                { headers }
              ).then(r => handleApiResponse(r, "tracks-details")).catch(() => ({ tracks: [] }));

              const deepCuts = (fullTracks.tracks || [])
                .filter(t => {
                  if (!t || t.popularity >= maxPopularity || excludeTrackIds.has(t.id)) return false;
                  return matchesDateFilter(t, filterYear, filterMonth);
                })
                .map(t => ({ ...t, album }));

              allDeepCuts.push(...deepCuts);
            }

            return { artist, tracks: allDeepCuts, source: "album" };
          } catch {
            return { artist, tracks: [], source: "album" };
          }
        })
      );

      // Collect ALL valid tracks
      const allValidTracks = [];
      const usedTrackIds = new Set();
      const usedArtistIds = new Set();

      function createTrackEntry(track, reason, score) {
        return { ...track, matchReason: reason, matchScore: score };
      }

      // Genre tracks
      const genreTracks = genreResults
        .flatMap(result =>
          result.tracks.map(track => ({ track, genre: result.genre }))
        )
        .sort(() => rand() - 0.5);

      const genreReasons = [
        (genre) => `Fresh ${genre} discovery`,
        (genre) => `New artist in ${genre}`,
        (genre) => `Underground ${genre} find`,
        (genre) => `${genre} gem`,
        (genre) => `Emerging ${genre} artist`,
        (genre) => `${genre} you haven't heard`,
        (genre) => `New ${genre} release`,
      ];

      for (const item of genreTracks) {
        const artistId = item.track.artists[0]?.id || "";
        if (usedTrackIds.has(item.track.id) || usedArtistIds.has(artistId)) continue;
        
        const reasonIdx = allValidTracks.length % genreReasons.length;
        const entry = createTrackEntry(
          item.track, 
          genreReasons[reasonIdx](item.genre), 
          Math.floor(75 + rand() * 20)
        );
        allValidTracks.push(entry);
        usedTrackIds.add(item.track.id);
        usedArtistIds.add(artistId);
      }

      // Album tracks
      const albumTracks = albumResults
        .flatMap(result =>
          result.tracks.map(track => ({ track, artist: result.artist }))
        )
        .sort(() => rand() - 0.5);

      const albumReasons = [
        (artist) => `Deep cut from ${artist}`,
        (artist) => `${artist} album track`,
        (artist) => `Hidden gem by ${artist}`,
      ];

      for (const item of albumTracks) {
        const artistId = item.track.artists?.[0]?.id || item.artist.id;
        if (usedTrackIds.has(item.track.id) || usedArtistIds.has(artistId)) continue;
        
        const reasonIdx = allValidTracks.length % albumReasons.length;
        const entry = createTrackEntry(
          item.track, 
          albumReasons[reasonIdx](item.artist.name), 
          Math.floor(80 + rand() * 15)
        );
        allValidTracks.push(entry);
        usedTrackIds.add(item.track.id);
        usedArtistIds.add(artistId);
      }

      console.log(`Found ${allValidTracks.length} total valid tracks for ${filterYear || 'any year'} ${filterMonth || 'any month'}`);

      // Shuffle and split into display (10) and backup
      const shuffled = [...allValidTracks].sort(() => rand() - 0.5);
      const displayTracks = shuffled.slice(0, 10);
      const backupTracks = shuffled.slice(10);
      
      backupTracksRef.current = backupTracks;
      setTracks(displayTracks);
      
      console.log(`Displaying ${displayTracks.length} tracks, ${backupTracks.length} in backup`);

    } catch (e) {
      console.error("Failed to fetch recommendations:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const replaceTrack = useCallback((trackId, index) => {
    rejectedTrackIds.current.add(trackId);
    
    setTracks(prev => {
      const currentArtistIds = new Set(
        prev
          .filter((_, i) => i !== index)
          .map(t => t.artists?.[0]?.id)
          .filter(Boolean)
      );
      
      let backupIdx = backupTracksRef.current.findIndex(
        t => !currentArtistIds.has(t.artists?.[0]?.id)
      );
      
      if (backupIdx === -1 && backupTracksRef.current.length > 0) {
        backupIdx = 0;
      }
      
      if (backupIdx !== -1) {
        const backup = backupTracksRef.current.splice(backupIdx, 1)[0];
        const newTracks = [...prev];
        newTracks[index] = backup;
        console.log(`Replaced track at index ${index} with backup. ${backupTracksRef.current.length} backups remaining.`);
        return newTracks;
      } else {
        console.log(`No backup available, removed track at index ${index}`);
        return prev.filter((_, i) => i !== index);
      }
    });
  }, []);

  const likeTrack = useCallback((trackId) => {
    likedTrackIds.current.add(trackId);
    console.log(`Liked track ${trackId}`);
  }, []);

  const refresh = useCallback((token, options = {}) => {
    fetchRecommendations(token, options);
  }, [fetchRecommendations]);

  return { 
    tracks, 
    fetchRecommendations, 
    refresh, 
    replaceTrack,
    likeTrack,
    isLoading, 
    replacingIndex,
    error,
    backupCount: backupTracksRef.current.length
  };
}
