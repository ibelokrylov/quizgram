import { convertToTwitterEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface TwitterPlayerProps {
  url: string;
}

export const TwitterPlayer = ({ url }: TwitterPlayerProps) => {
  const embedUrl = convertToTwitterEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className='player'>
      <iframe
        src={embedUrl}
        title='Twitter video player'
        frameBorder='0'
        allow='autoplay; encrypted-media'
        allowFullScreen
      ></iframe>
    </div>
  );
};
