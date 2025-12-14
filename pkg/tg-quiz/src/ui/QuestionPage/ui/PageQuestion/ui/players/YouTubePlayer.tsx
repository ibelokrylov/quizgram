import { convertToYouTubeEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface YouTubePlayerProps {
  url: string;
}

export const YouTubePlayer = ({ url }: YouTubePlayerProps) => {
  const embedUrl = convertToYouTubeEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className='player'>
      <iframe
        src={embedUrl}
        title='YouTube video player'
        frameBorder='0'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
        referrerPolicy='strict-origin-when-cross-origin'
        allowFullScreen
      ></iframe>
    </div>
  );
};
