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
  if (filterMonth && !month) return true;
  
  return true;
}

/**
 * Generate adjacent/related genres from user's genres
 * This helps find artists outside the user's immediate bubble
 */
function generateAdjacentGenres(userGenres, rand) {
  const genreAdjacencies = {
    'hip hop': ['boom bap', 'conscious hip hop', 'jazz rap', 'lo-fi hip hop', 'underground hip hop', 'abstract hip hop', 'experimental hip hop'],
    'rap': ['southern hip hop', 'east coast hip hop', 'west coast rap', 'uk hip hop', 'australian hip hop', 'french hip hop'],
    'pop': ['art pop', 'chamber pop', 'dream pop', 'synthpop', 'indie pop', 'baroque pop', 'electropop'],
    'rock': ['post-rock', 'math rock', 'shoegaze', 'psychedelic rock', 'krautrock', 'space rock', 'stoner rock'],
    'indie': ['bedroom pop', 'hypnagogic pop', 'chillwave', 'slowcore', 'sadcore', 'indie rock', 'lo-fi indie'],
    'electronic': ['idm', 'ambient', 'downtempo', 'trip hop', 'glitch', 'microhouse', 'minimal techno'],
    'r&b': ['neo soul', 'quiet storm', 'alternative r&b', 'progressive soul', 'uk soul', 'pj soul'],
    'soul': ['northern soul', 'psychedelic soul', 'deep funk', 'modern funk', 'blue-eyed soul'],
    'jazz': ['nu jazz', 'spiritual jazz', 'jazz fusion', 'acid jazz', 'cool jazz', 'modal jazz'],
    'folk': ['freak folk', 'psych folk', 'chamber folk', 'indie folk', 'anti-folk', 'neofolk'],
    'metal': ['post-metal', 'sludge metal', 'doom metal', 'stoner rock', 'progressive metal', 'atmospheric black metal'],
    'punk': ['post-punk', 'art punk', 'noise rock', 'no wave', 'post-hardcore', 'hardcore punk'],
    'country': ['alt-country', 'americana', 'outlaw country', 'country rock', 'cosmic americana'],
    'funk': ['p-funk', 'boogie', 'electro funk', 'go-go', 'modern funk', 'synth funk'],
    'alternative': ['art rock', 'experimental rock', 'noise pop', 'industrial', 'post-punk revival'],
    'dance': ['uk garage', 'breakbeat', 'house', 'deep house', 'disco house'],
    'experimental': ['avant-garde', 'noise', 'drone', 'musique concrete', 'field recordings'],
    'latin': ['tropicalia', 'cumbia', 'bossa nova', 'latin jazz', 'psychedelic cumbia'],
    'reggae': ['dub', 'roots reggae', 'lovers rock', 'dancehall'],
  };

  // Additional discovery genres for variety
  const discoveryGenres = [
    'neo-psychedelia', 'post-punk revival', 'new weird america', 'hyperpop',
    'afrobeat', 'ethio-jazz', 'tuareg guitar', 'desert blues', 
    'city pop', 'shibuya-kei', 'j-rock', 'k-indie',
    'brazilian psychedelic', 'cumbia digital', 'latin alternative',
    'afro house', 'amapiano', 'gqom',
    'uk garage', 'breakbeat', 'jungle',
    'vaporwave', 'chillwave', 'lo-fi beats',
    'post-rock', 'math rock', 'midwest emo',
    'witch house', 'dark wave', 'coldwave',
    'neo soul', 'progressive soul', 'uk soul',
  ];

  const adjacent = new Set();
  
  // Find adjacent genres from user's genres
  for (const genre of userGenres) {
    const genreLower = genre.toLowerCase();
    for (const [key, adjacentList] of Object.entries(genreAdjacencies)) {
      if (genreLower.includes(key)) {
        adjacentList.forEach(g => adjacent.add(g));
      }
    }
  }
  
  // Add some random discovery genres
  const shuffledDiscovery = [...discoveryGenres].sort(() => rand() - 0.5);
  shuffledDiscovery.slice(0, 8).forEach(g => adjacent.add(g));
  
  return [...adjacent].sort(() => rand() - 0.5);
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
  const seenArtistNames = useRef(new Set()); // Track artist names we've shown

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
          fetch("https://api.spotify.com/v1/me/top/artists?limit=50&time_range=long_term", { headers })
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
        const knownArtistNames = new Set();

        // Collect ALL artists the user has interacted with
        (topTracksMedium.items || []).forEach(t => {
          knownTrackIds.add(t.id);
          t.artists.forEach(a => {
            knownArtistIds.add(a.id);
            knownArtistNames.add(a.name.toLowerCase());
          });
        });
        (topTracksShort.items || []).forEach(t => {
          knownTrackIds.add(t.id);
          t.artists.forEach(a => {
            knownArtistIds.add(a.id);
            knownArtistNames.add(a.name.toLowerCase());
          });
        });
        (recentlyPlayed.items || []).forEach(item => {
          if (item.track) {
            knownTrackIds.add(item.track.id);
            item.track.artists?.forEach(a => {
              knownArtistIds.add(a.id);
              knownArtistNames.add(a.name.toLowerCase());
            });
          }
        });
        (savedTracks.items || []).forEach(item => {
          if (item.track) {
            knownTrackIds.add(item.track.id);
            item.track.artists?.forEach(a => {
              knownArtistIds.add(a.id);
              knownArtistNames.add(a.name.toLowerCase());
            });
          }
        });

        const allGenres = [];
        (topArtists.items || []).forEach(a => {
          knownArtistIds.add(a.id);
          knownArtistNames.add(a.name.toLowerCase());
          allGenres.push(...(a.genres || []));
        });

        userData = {
          topArtists: topArtists.items || [],
          knownTrackIds,
          knownArtistIds,
          knownArtistNames,
          allGenres: [...new Set(allGenres)],
        };
        userDataRef.current = userData;
        
        console.log(`Filtering out ${knownTrackIds.size} known tracks, ${knownArtistIds.size} known artists, ${knownArtistNames.size} artist names`);
      }

      const { knownTrackIds, knownArtistIds, knownArtistNames, allGenres } = userData;
      const excludeTrackIds = new Set([...knownTrackIds, ...rejectedTrackIds.current]);
      
      // Generate adjacent genres for wider discovery
      const adjacentGenres = generateAdjacentGenres(allGenres, rand);
      
      // Mix user's genres with adjacent genres (prioritize adjacent for discovery)
      const userGenresShuffled = [...allGenres].sort(() => rand() - 0.5).slice(0, 6);
      const searchGenres = [
        ...adjacentGenres.slice(0, 10),  // More adjacent genres
        ...userGenresShuffled.slice(0, 4), // Fewer user genres
      ];
      
      const yearFilter = buildYearFilter(filterYear);
      const hasDateFilter = !!filterYear || !!filterMonth;
      
      // Popularity: established indie to major artists (30-90 range)
      const yearNum = filterYear ? parseInt(filterYear) : new Date().getFullYear();
      const isOlderMusic = yearNum < 2010;
      const minPopularity = isOlderMusic ? 20 : 30;
      const maxPopularity = 90;

      console.log("Searching genres:", searchGenres.slice(0, 8), "...", `(${searchGenres.length} total)`);
      console.log(`Popularity range: ${minPopularity}-${maxPopularity}`);

      // Search with fewer API calls to avoid rate limiting
      // Only use 6 genres with 1 offset each = 6 API calls
      const searchGenresLimited = searchGenres.slice(0, 6);
      
      const searchPromises = searchGenresLimited.map(async (genre) => {
        try {
          const offset = Math.floor(rand() * 100);
          const query = encodeURIComponent(`genre:"${genre}" ${yearFilter}`);
          const data = await fetch(
            `https://api.spotify.com/v1/search?q=${query}&type=track&limit=50&offset=${offset}&market=US`,
            { headers }
          ).then(r => handleApiResponse(r, "search"));
          
          const filteredTracks = (data.tracks?.items || []).filter(track => {
            const pop = track.popularity;
            const artistName = track.artists[0]?.name?.toLowerCase() || '';
            
            // Check both ID and name to catch known artists
            const isKnownById = track.artists.some(a => knownArtistIds.has(a.id));
            const isKnownByName = knownArtistNames.has(artistName);
            const wasSeenBefore = seenArtistNames.current.has(artistName);
            
            const isUnknownArtist = !isKnownById && !isKnownByName && !wasSeenBefore;
            const isInPopRange = pop >= minPopularity && pop <= maxPopularity;
            const notExcluded = !excludeTrackIds.has(track.id);
            const matchesDate = matchesDateFilter(track, filterYear, filterMonth);
            
            // Quality check: avoid tracks with very short names (often spam)
            const hasReasonableName = track.name.length > 2 && artistName.length > 2;
            
            return isUnknownArtist && isInPopRange && notExcluded && matchesDate && hasReasonableName;
          });
          
          return { genre, tracks: filteredTracks, source: "genre" };
        } catch {
          return { genre, tracks: [], source: "genre" };
        }
      });

      const genreResults = await Promise.all(searchPromises);

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
        (genre) => `Explore ${genre}`,
        (genre) => `Hidden ${genre} talent`,
      ];

      for (const item of genreTracks) {
        const artistId = item.track.artists[0]?.id || "";
        const artistName = item.track.artists[0]?.name?.toLowerCase() || "";
        
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
        
        // Track this artist name so we don't show them again in future refreshes
        seenArtistNames.current.add(artistName);
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
        
        // Track this artist
        const artistName = backup.artists?.[0]?.name?.toLowerCase();
        if (artistName) seenArtistNames.current.add(artistName);
        
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
