import { convertToVimeoEmbedUrl } from '../Player.utils';
import { UnknownPlayer } from './UnknownPlayer';

interface VimeoPlayerProps {
  url: string;
}

export const VimeoPlayer = ({ url }: VimeoPlayerProps) => {
  const embedUrl = convertToVimeoEmbedUrl(url);

  if (!embedUrl) {
    return <UnknownPlayer />;
  }

  return (
    <div className='player'>
      <iframe
        src={embedUrl}
        title='Vimeo video player'
        frameBorder='0'
        allow='autoplay; fullscreen; picture-in-picture'
        allowFullScreen
      ></iframe>
    </div>
  );
};
