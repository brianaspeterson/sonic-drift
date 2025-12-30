import { VinylIcon } from './VinylIcon';

export function Header({ onConnect, showConnectButton }) {
  const today = new Date();
  const dateString = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="header animate-in">
      <div className="logo-section">
        <VinylIcon className="logo-vinyl" />
        <div>
          <h1 className="logo-title">Sonic Drift</h1>
          <p className="date-display">{dateString}</p>
        </div>
      </div>
      {showConnectButton && (
        <button className="btn-primary" onClick={onConnect}>
          Connect Spotify
        </button>
      )}
    </header>
  );
}
