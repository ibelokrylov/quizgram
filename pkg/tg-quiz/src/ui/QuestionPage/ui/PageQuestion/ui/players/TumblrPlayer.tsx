import { convertToTumblrEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface TumblrPlayerProps {
  url: string;
}

export const TumblrPlayer = ({ url }: TumblrPlayerProps) => {
  const embedUrl = convertToTumblrEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className='player'>
      <iframe
        src={embedUrl}
        title='Tumblr video player'
        frameBorder='0'
        allow='autoplay; encrypted-media'
        allowFullScreen
      ></iframe>
    </div>
  );
};

