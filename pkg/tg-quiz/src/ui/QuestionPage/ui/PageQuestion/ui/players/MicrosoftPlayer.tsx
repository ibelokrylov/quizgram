import { convertToMicrosoftEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface MicrosoftPlayerProps {
  url: string;
}

export const MicrosoftPlayer = ({ url }: MicrosoftPlayerProps) => {
  const embedUrl = convertToMicrosoftEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className="player">
      <iframe
        src={embedUrl}
        title="Microsoft video player"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      ></iframe>
    </div>
  );
};
