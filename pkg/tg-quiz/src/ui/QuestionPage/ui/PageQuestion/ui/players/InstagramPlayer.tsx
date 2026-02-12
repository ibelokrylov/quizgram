import { convertToInstagramEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface InstagramPlayerProps {
  url: string;
}

export const InstagramPlayer = ({ url }: InstagramPlayerProps) => {
  const embedUrl = convertToInstagramEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className="player">
      <iframe
        src={embedUrl}
        title="Instagram video player"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      ></iframe>
    </div>
  );
};
