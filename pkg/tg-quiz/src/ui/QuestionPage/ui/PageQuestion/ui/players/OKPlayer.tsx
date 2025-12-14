import { convertToOKEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface OKPlayerProps {
  url: string;
}

export const OKPlayer = ({ url }: OKPlayerProps) => {
  const embedUrl = convertToOKEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className='player'>
      <iframe
        src={embedUrl}
        title='OK video player'
        frameBorder='0'
        allow='autoplay; fullscreen'
        allowFullScreen
      ></iframe>
    </div>
  );
};
