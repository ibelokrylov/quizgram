import { convertToSpotifyEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface SpotifyPlayerProps {
  url: string;
}

export const SpotifyPlayer = ({ url }: SpotifyPlayerProps) => {
  const embedUrl = convertToSpotifyEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className="player">
      <iframe
        src={embedUrl}
        title="Spotify audio player"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};
