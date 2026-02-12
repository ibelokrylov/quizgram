import { convertToRutubeEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface RutubePlayerProps {
  url: string;
}

export const RutubePlayer = ({ url }: RutubePlayerProps) => {
  const embedUrl = convertToRutubeEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className="player">
      <iframe
        src={embedUrl}
        title="Rutube video player"
        frameBorder="0"
        allow="clipboard-write; autoplay"
        allowFullScreen
      ></iframe>
    </div>
  );
};
