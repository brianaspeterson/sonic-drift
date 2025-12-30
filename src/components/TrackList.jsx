import { TrackCard } from './TrackCard';
import { DateFilter } from './DateFilter';

function RefreshIcon({ spinning }) {
  return (
    <svg 
      className={spinning ? "refresh-icon spinning" : "refresh-icon"} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

export function TrackList({ 
  tracks, 
  isDemo, 
  onRefresh, 
  isRefreshing,
  onDislike,
  onLike,
  replacingIndex,
  backupCount = 0,
  filterMonth,
  filterYear,
  onMonthChange,
  onYearChange,
}) {
  const hasFilter = filterMonth || filterYear;
  const filterLabel = hasFilter 
    ? `${filterMonth ? new Date(2000, parseInt(filterMonth) - 1).toLocaleString('en-US', { month: 'short' }) : ''} ${filterYear || ''}`.trim()
    : null;

  return (
    <div className="results-state">
      {isDemo && (
        <div className="demo-banner animate-in delay-1">
          <span className="demo-emoji">🎵</span>
          <div>
            <div className="demo-title">Demo Mode</div>
            <div className="demo-description">
              Connect Spotify for personalized recommendations
            </div>
          </div>
        </div>
      )}

      <div className="section-header animate-in delay-1">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">
              {filterLabel ? `${filterLabel} Picks` : "Today's Picks"}
            </h2>
            <p className="section-subtitle">
              {tracks.length} tracks to discover
              {!isDemo && backupCount > 0 && (
                <span className="backup-count"> · {backupCount} more available</span>
              )}
            </p>
          </div>
          {!isDemo && (
            <button 
              className="btn-refresh" 
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshIcon spinning={isRefreshing} />
              <span>{isRefreshing ? "Loading" : "Refresh"}</span>
            </button>
          )}
        </div>
      </div>

      {!isDemo && (
        <div className="filters-row animate-in delay-2">
          <DateFilter
            month={filterMonth}
            year={filterYear}
            onMonthChange={onMonthChange}
            onYearChange={onYearChange}
            disabled={isRefreshing}
          />
        </div>
      )}

      <div className="track-list">
        {tracks.map((track, index) => (
          <TrackCard 
            key={track.id} 
            track={track} 
            index={index}
            onDislike={isDemo ? undefined : onDislike}
            onLike={isDemo ? undefined : onLike}
            isReplacing={replacingIndex === index}
          />
        ))}
      </div>

      {tracks.length === 0 && !isRefreshing && (
        <div className="no-tracks-message">
          No tracks found. Try a different time period or refresh.
        </div>
      )}

      <div className="footer animate-in delay-5">
        <p className="footer-text">
          {isDemo 
            ? "Connect to unlock personalized picks" 
            : "Swipe through to discover · Click to open in Spotify"}
        </p>
      </div>
    </div>
  );
}
