# Sonic Drift 🎵

A beautiful React app that discovers fresh music tailored to your taste — every single day.

## Features

- **Daily Discovery**: Get 10 personalized track recommendations each day
- **Multiple Sources**: Combines artist deep cuts, genre exploration, and album discoveries
- **Beautiful UI**: Dark theme with smooth animations and a vinyl-inspired design
- **Spotify Integration**: Connects securely using OAuth 2.0 with PKCE

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Spotify

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app (or use an existing one)
3. Add your redirect URI (shown in console when you run the app)
4. Copy your **Client ID**
5. Update `src/config.js` with your Client ID:

```js
export const SPOTIFY_CLIENT_ID = "d1c7ee33d13a4523afd548c054039113";
```

### 3. Run the App

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### 4. Add Redirect URI

When the app runs, check the console for the exact redirect URI to add to your Spotify app settings.

## Project Structure

```
src/
├── components/          # React UI components
│   ├── Header.jsx
│   ├── EmptyState.jsx
│   ├── LoadingState.jsx
│   ├── TrackCard.jsx
│   ├── TrackList.jsx
│   └── VinylIcon.jsx
├── hooks/               # Custom React hooks
│   ├── useSpotifyAuth.js
│   └── useRecommendations.js
├── App.jsx              # Main app component
├── App.css              # Styles
├── config.js            # Spotify configuration
└── main.jsx             # Entry point
```

## How It Works

The app uses a hybrid recommendation approach that pulls from 3 sources:

1. **Artist Deep Cuts (4 tracks)**: Tracks from your top artists you haven't been playing
2. **Genre Discovery (3 tracks)**: New artists in genres you love
3. **Album Exploration (3 tracks)**: Album cuts from your favorite artists' discographies

Each day, the recommendations are seeded with the current date, so you get fresh picks every day!

## Tech Stack

- **React 18** with hooks
- **Vite** for fast development
- **Spotify Web API** for music data
- **CSS3** with custom properties and animations

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## License

MIT
