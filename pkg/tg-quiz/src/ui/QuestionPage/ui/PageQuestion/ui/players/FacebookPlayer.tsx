import { convertToFacebookEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface FacebookPlayerProps {
  url: string;
}

export const FacebookPlayer = ({ url }: FacebookPlayerProps) => {
  const embedUrl = convertToFacebookEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className="player">
      <iframe
        src={embedUrl}
        title="Facebook video player"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      ></iframe>
    </div>
  );
};
