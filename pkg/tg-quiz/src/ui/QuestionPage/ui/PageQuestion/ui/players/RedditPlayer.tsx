import { convertToRedditEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface RedditPlayerProps {
  url: string;
}

export const RedditPlayer = ({ url }: RedditPlayerProps) => {
  const embedUrl = convertToRedditEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className='player'>
      <iframe
        src={embedUrl}
        title='Reddit video player'
        frameBorder='0'
        allow='autoplay; encrypted-media'
        allowFullScreen
      ></iframe>
    </div>
  );
};
