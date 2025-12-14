import { detectedPlatform } from './Player.utils';
import { ApplePlayer } from './players/ApplePlayer';
import { FacebookPlayer } from './players/FacebookPlayer';
import { GooglePlayer } from './players/GooglePlayer';
import { InstagramPlayer } from './players/InstagramPlayer';
import { LinkedInPlayer } from './players/LinkedInPlayer';
import { MicrosoftPlayer } from './players/MicrosoftPlayer';
import { OKPlayer } from './players/OKPlayer';
import { PinterestPlayer } from './players/PinterestPlayer';
import { RedditPlayer } from './players/RedditPlayer';
import { RutubePlayer } from './players/RutubePlayer';
import { SoundCloudPlayer } from './players/SoundCloudPlayer';
import { SpotifyPlayer } from './players/SpotifyPlayer';
import { TikTokPlayer } from './players/TikTokPlayer';
import { TumblrPlayer } from './players/TumblrPlayer';
import { TwitterPlayer } from './players/TwitterPlayer';
import { UnknownPlayer } from './players/UnknownPlayer';
import { VimeoPlayer } from './players/VimeoPlayer';
import { VKPlayer } from './players/VKPlayer';
import { YouTubePlayer } from './players/YouTubePlayer';

export const Player = ({ url }: { url: string }) => {
  const platform = detectedPlatform(url);

  switch (platform) {
    case 'vk':
      return <VKPlayer url={url} />;
    case 'youtube':
      return <YouTubePlayer url={url} />;
    case 'vimeo':
      return <VimeoPlayer url={url} />;
    case 'rutube':
      return <RutubePlayer url={url} />;
    case 'ok':
      return <OKPlayer url={url} />;
    case 'tiktok':
      return <TikTokPlayer url={url} />;
    case 'instagram':
      return <InstagramPlayer url={url} />;
    case 'facebook':
      return <FacebookPlayer url={url} />;
    case 'twitter':
      return <TwitterPlayer url={url} />;
    case 'linkedin':
      return <LinkedInPlayer url={url} />;
    case 'pinterest':
      return <PinterestPlayer url={url} />;
    case 'reddit':
      return <RedditPlayer url={url} />;
    case 'tumblr':
      return <TumblrPlayer url={url} />;
    case 'soundcloud':
      return <SoundCloudPlayer url={url} />;
    case 'spotify':
      return <SpotifyPlayer url={url} />;
    case 'apple':
      return <ApplePlayer url={url} />;
    case 'google':
      return <GooglePlayer url={url} />;
    case 'microsoft':
      return <MicrosoftPlayer url={url} />;
    case 'unknown':
      return <UnknownPlayer />;
  }
};
