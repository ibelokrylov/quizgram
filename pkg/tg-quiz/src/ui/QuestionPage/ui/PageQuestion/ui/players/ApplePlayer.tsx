import { convertToAppleMusicEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface ApplePlayerProps {
  url: string;
}

export const ApplePlayer = ({ url }: ApplePlayerProps) => {
  const embedUrl = convertToAppleMusicEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className='player'>
      <iframe
        src={embedUrl}
        title='Apple Music player'
        frameBorder='0'
        allow='autoplay; encrypted-media'
        allowFullScreen
      ></iframe>
    </div>
  );
};

