import { convertToSoundCloudEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface SoundCloudPlayerProps {
  url: string;
}

export const SoundCloudPlayer = ({ url }: SoundCloudPlayerProps) => {
  const embedUrl = convertToSoundCloudEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className="player">
      <iframe
        src={embedUrl}
        title="SoundCloud audio player"
        frameBorder="0"
        allow="autoplay"
        allowFullScreen
      ></iframe>
    </div>
  );
};
