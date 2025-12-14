import { convertToPinterestEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface PinterestPlayerProps {
  url: string;
}

export const PinterestPlayer = ({ url }: PinterestPlayerProps) => {
  const embedUrl = convertToPinterestEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className='player'>
      <iframe
        src={embedUrl}
        title='Pinterest video player'
        frameBorder='0'
        allow='autoplay; encrypted-media'
        allowFullScreen
      ></iframe>
    </div>
  );
};
