import { convertToTikTokEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface TikTokPlayerProps {
  url: string;
}

export const TikTokPlayer = ({ url }: TikTokPlayerProps) => {
  const embedUrl = convertToTikTokEmbedUrl(url);
  console.log(embedUrl);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className='player player__tiktok'>
      <iframe
        src={embedUrl}
        title='TikTok video player'
        frameBorder='0'
        allow='autoplay; encrypted-media'
        allowFullScreen
      ></iframe>
    </div>
  );
};
