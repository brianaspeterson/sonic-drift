export function LoadingState() {
  return (
    <div className="loading">
      <div className="loading-vinyl">
        <svg 
          className="vinyl-spin" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{ width: '100%', height: '100%' }}
        >
          <circle cx="12" cy="12" r="10" opacity="0.2" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      </div>
      <p className="loading-text">Finding new music...</p>
    </div>
  );
}
