import { convertToLinkedInEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface LinkedInPlayerProps {
  url: string;
}

export const LinkedInPlayer = ({ url }: LinkedInPlayerProps) => {
  const embedUrl = convertToLinkedInEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className='player'>
      <iframe
        src={embedUrl}
        title='LinkedIn video player'
        frameBorder='0'
        allow='autoplay; encrypted-media'
        allowFullScreen
      ></iframe>
    </div>
  );
};
