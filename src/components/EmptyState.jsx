export function EmptyState({ onConnect }) {
  return (
    <div className="empty-state animate-in delay-2">
      <div className="empty-vinyl">
        <span style={{ fontSize: '2.5rem' }}>🎧</span>
      </div>
      <h2 className="empty-title">Discover new music</h2>
      <p className="empty-description">
        Connect your Spotify to get personalized recommendations based on your listening history.
      </p>
      <button className="btn-primary btn-large" onClick={onConnect}>
        Connect Spotify
      </button>
      <p className="empty-note">
        Read-only access · No data stored
      </p>
    </div>
  );
}
