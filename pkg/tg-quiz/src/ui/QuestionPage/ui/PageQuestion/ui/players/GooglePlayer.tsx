import { convertToGoogleEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface GooglePlayerProps {
  url: string;
}

export const GooglePlayer = ({ url }: GooglePlayerProps) => {
  const embedUrl = convertToGoogleEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className='player'>
      <iframe
        src={embedUrl}
        title='Google video player'
        frameBorder='0'
        allow='autoplay; encrypted-media'
        allowFullScreen
      ></iframe>
    </div>
  );
};

