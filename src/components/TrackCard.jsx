function formatDuration(ms) {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

function ThumbsDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}

function ThumbsUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function TrackCard({ track, index, onDislike, onLike, isReplacing }) {
  const num = String(index + 1).padStart(2, "0");
  const spotifyUrl = track.external_urls?.spotify || "#";
  const albumArt = track.album?.images?.[0]?.url || "";
  const artistNames = track.artists?.map(a => a.name).join(", ") || "Unknown Artist";

  const handleDislike = (e) => {
    e.stopPropagation();
    if (onDislike) onDislike(track.id, index);
  };

  const handleLike = (e) => {
    e.stopPropagation();
    if (onLike) onLike(track.id);
  };

  return (
    <div
      className={`track-card animate-in delay-${Math.min(index + 1, 5)} ${isReplacing ? 'replacing' : ''}`}
      onClick={() => window.open(spotifyUrl, "_blank")}
    >
      <div className="track-number">{num}</div>
      
      <div className="album-art">
        {albumArt && <img src={albumArt} alt={track.name} loading="lazy" />}
        {isReplacing && <div className="album-art-loading" />}
      </div>
      
      <div className="track-info">
        <div className="track-name">{track.name}</div>
        <div className="track-artist">{artistNames}</div>
      </div>
      
      <div className="track-meta">
        <div className="track-duration">{formatDuration(track.duration_ms)}</div>
      </div>

      <div className="track-actions">
        <button 
          className="btn-feedback btn-like" 
          onClick={handleLike}
          title="I like this"
        >
          <ThumbsUpIcon />
        </button>
        <button 
          className="btn-feedback btn-dislike" 
          onClick={handleDislike}
          title="Skip this"
          disabled={isReplacing}
        >
          <ThumbsDownIcon />
        </button>
      </div>
      
      <a
        href={spotifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="spotify-link"
        onClick={(e) => e.stopPropagation()}
        title="Open in Spotify"
      >
        <ExternalLinkIcon />
      </a>
    </div>
  );
}
