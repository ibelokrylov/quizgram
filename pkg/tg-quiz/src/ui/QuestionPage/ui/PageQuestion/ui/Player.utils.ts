export type Platform =
  | 'youtube'
  | 'vimeo'
  | 'ok'
  | 'rutube'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'pinterest'
  | 'reddit'
  | 'tumblr'
  | 'soundcloud'
  | 'spotify'
  | 'apple'
  | 'google'
  | 'microsoft'
  | 'vk'
  | 'unknown';

export function detectedPlatform(url: string): Platform {
  const platform = new URL(url).hostname;

  switch (true) {
    case platform.includes('youtube'):
      return 'youtube';
    case platform.includes('vimeo'):
      return 'vimeo';
    case platform.includes('tiktok'):
      return 'tiktok';
    case platform.includes('ok.ru'):
      return 'ok';
    case platform.includes('rutube'):
      return 'rutube';
    case platform.includes('instagram'):
      return 'instagram';
    case platform.includes('facebook'):
      return 'facebook';
    case platform.includes('twitter'):
    case platform.includes('x.com'):
      return 'twitter';
    case platform.includes('linkedin'):
      return 'linkedin';
    case platform.includes('pinterest'):
      return 'pinterest';
    case platform.includes('reddit'):
      return 'reddit';
    case platform.includes('tumblr'):
      return 'tumblr';
    case platform.includes('soundcloud'):
      return 'soundcloud';
    case platform.includes('spotify'):
      return 'spotify';
    case platform.includes('apple'):
      return 'apple';
    case platform.includes('google'):
      return 'google';
    case platform.includes('microsoft'):
      return 'microsoft';
    case platform.includes('vk.com'):
      return 'vk';
    default:
      return 'unknown';
  }
}

/**
 * Извлекает video ID из различных форматов YouTube URL
 * Поддерживает форматы:
 * - http://youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://youtube.com/embed/VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Формат: youtube.com/watch?v=VIDEO_ID или youtube.com/embed/VIDEO_ID
    if (urlObj.hostname.includes('youtube.com')) {
      // Проверяем параметр v в query string
      if (urlObj.searchParams.has('v')) {
        return urlObj.searchParams.get('v');
      }
      // Проверяем путь /embed/VIDEO_ID
      const embedMatch = urlObj.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch) {
        return embedMatch[1];
      }
      // Проверяем путь /watch (может быть без параметра v, но это редко)
      if (urlObj.pathname === '/watch' && urlObj.searchParams.has('v')) {
        return urlObj.searchParams.get('v');
      }
    }

    // Формат: youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be' || urlObj.hostname.includes('youtu.be')) {
      const pathMatch = urlObj.pathname.match(/\/([^/?]+)/);
      if (pathMatch) {
        return pathMatch[1];
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении YouTube video ID:', error);
    return null;
  }
}

/**
 * Преобразует YouTube URL в embed URL согласно документации Google
 * Использует Privacy Enhanced Mode (youtube-nocookie.com)
 */
export function convertToYouTubeEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return null;
  }

  // Используем Privacy Enhanced Mode согласно документации
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

/**
 * Извлекает video ID из Vimeo URL
 * Поддерживает форматы:
 * - https://vimeo.com/VIDEO_ID
 * - https://player.vimeo.com/video/VIDEO_ID
 */
export function extractVimeoVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('vimeo.com')) {
      // Формат: player.vimeo.com/video/VIDEO_ID
      const embedMatch = urlObj.pathname.match(/\/video\/(\d+)/);
      if (embedMatch) {
        return embedMatch[1];
      }
      // Формат: vimeo.com/VIDEO_ID
      const directMatch = urlObj.pathname.match(/\/(\d+)/);
      if (directMatch) {
        return directMatch[1];
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении Vimeo video ID:', error);
    return null;
  }
}

export function convertToVimeoEmbedUrl(url: string): string | null {
  const videoId = extractVimeoVideoId(url);
  if (!videoId) {
    return null;
  }
  return `https://player.vimeo.com/video/${videoId}`;
}

/**
 * Извлекает video ID из Rutube URL
 * Поддерживает форматы:
 * - https://rutube.ru/video/VIDEO_ID/
 * - https://rutube.ru/play/embed/VIDEO_ID
 */
export function extractRutubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('rutube.ru')) {
      // Формат: rutube.ru/video/VIDEO_ID/ или rutube.ru/play/embed/VIDEO_ID
      const match = urlObj.pathname.match(/\/(video|play\/embed)\/([a-zA-Z0-9]+)/);
      if (match) {
        return match[2];
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении Rutube video ID:', error);
    return null;
  }
}

export function convertToRutubeEmbedUrl(url: string): string | null {
  const videoId = extractRutubeVideoId(url);
  if (!videoId) {
    return null;
  }
  return `https://rutube.ru/play/embed/${videoId}`;
}

/**
 * Извлекает video ID из OK (Одноклассники) URL
 * Поддерживает форматы:
 * - https://ok.ru/video/VIDEO_ID
 * - https://ok.ru/videoembed/VIDEO_ID
 */
export function extractOKVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('ok.ru')) {
      // Формат: ok.ru/video/VIDEO_ID или ok.ru/videoembed/VIDEO_ID
      const match = urlObj.pathname.match(/\/(video|videoembed)\/(\d+)/);
      if (match) {
        return match[2];
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении OK video ID:', error);
    return null;
  }
}

export function convertToOKEmbedUrl(url: string): string | null {
  const videoId = extractOKVideoId(url);
  if (!videoId) {
    return null;
  }
  return `https://ok.ru/videoembed/${videoId}`;
}

/**
 * Извлекает video ID из TikTok URL
 * Поддерживает форматы:
 * - https://www.tiktok.com/@username/video/VIDEO_ID
 * - https://vm.tiktok.com/SHORT_CODE/
 */
export function extractTikTokVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('tiktok.com')) {
      // Формат: tiktok.com/@username/video/VIDEO_ID
      const match = urlObj.pathname.match(/\/video\/(\d+)/);
      if (match) {
        return match[1];
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении TikTok video ID:', error);
    return null;
  }
}

export function convertToTikTokEmbedUrl(url: string): string | null {
  const videoId = extractTikTokVideoId(url);
  if (!videoId) {
    return null;
  }
  return `https://www.tiktok.com/embed/v2/${videoId}`;
}

/**
 * Извлекает post ID из Instagram URL
 * Поддерживает форматы:
 * - https://www.instagram.com/p/POST_ID/
 * - https://www.instagram.com/reel/POST_ID/
 * - https://instagram.com/p/POST_ID/
 */
export function extractInstagramPostId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('instagram.com')) {
      // Формат: instagram.com/p/POST_ID/ или instagram.com/reel/POST_ID/
      const match = urlObj.pathname.match(/\/(p|reel)\/([a-zA-Z0-9_-]+)/);
      if (match) {
        return match[2];
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении Instagram post ID:', error);
    return null;
  }
}

/**
 * Преобразует Instagram URL в embed URL
 */
export function convertToInstagramEmbedUrl(url: string): string | null {
  const postId = extractInstagramPostId(url);
  if (!postId) {
    return null;
  }
  return `https://www.instagram.com/p/${postId}/embed/`;
}

/**
 * Извлекает video ID или формирует embed URL из Facebook URL
 * Поддерживает форматы:
 * - https://www.facebook.com/video.php?v=VIDEO_ID
 * - https://www.facebook.com/USERNAME/videos/VIDEO_ID
 * - https://fb.watch/VIDEO_ID
 */
export function convertToFacebookEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('facebook.com')) {
      // Формат: facebook.com/video.php?v=VIDEO_ID
      if (urlObj.searchParams.has('v')) {
        const encodedUrl = encodeURIComponent(url);
        return `https://www.facebook.com/plugins/video.php?href=${encodedUrl}`;
      }

      // Формат: facebook.com/USERNAME/videos/VIDEO_ID
      const videosMatch = urlObj.pathname.match(/\/videos\/(\d+)/);
      if (videosMatch) {
        const encodedUrl = encodeURIComponent(url);
        return `https://www.facebook.com/plugins/video.php?href=${encodedUrl}`;
      }

      // Если это просто URL поста с видео, используем его напрямую
      const encodedUrl = encodeURIComponent(url);
      return `https://www.facebook.com/plugins/video.php?href=${encodedUrl}`;
    }

    // Формат: fb.watch/VIDEO_ID
    if (urlObj.hostname.includes('fb.watch')) {
      const encodedUrl = encodeURIComponent(url);
      return `https://www.facebook.com/plugins/video.php?href=${encodedUrl}`;
    }

    return null;
  } catch (error) {
    console.error('Ошибка при конвертации Facebook URL:', error);
    return null;
  }
}

/**
 * Извлекает tweet ID из Twitter/X URL
 * Поддерживает форматы:
 * - https://twitter.com/username/status/TWEET_ID
 * - https://x.com/username/status/TWEET_ID
 * - https://www.twitter.com/username/status/TWEET_ID
 * - https://www.x.com/username/status/TWEET_ID
 */
export function extractTwitterTweetId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) {
      // Формат: twitter.com/username/status/TWEET_ID или x.com/username/status/TWEET_ID
      const match = urlObj.pathname.match(/\/status\/(\d+)/);
      if (match) {
        return match[1];
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении Twitter tweet ID:', error);
    return null;
  }
}

/**
 * Преобразует Twitter/X URL в embed URL
 */
export function convertToTwitterEmbedUrl(url: string): string | null {
  const tweetId = extractTwitterTweetId(url);
  if (!tweetId) {
    return null;
  }
  return `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`;
}

/**
 * Извлекает post ID из LinkedIn URL
 * Поддерживает форматы:
 * - https://www.linkedin.com/posts/USERNAME_POSTID
 * - https://www.linkedin.com/feed/update/urn:li:activity:POSTID
 */
export function extractLinkedInPostId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('linkedin.com')) {
      // Формат: linkedin.com/posts/USERNAME_POSTID
      const postsMatch = urlObj.pathname.match(/\/posts\/([^/?]+)/);
      if (postsMatch) {
        return postsMatch[1];
      }

      // Формат: linkedin.com/feed/update/urn:li:activity:POSTID
      const feedMatch = urlObj.pathname.match(/urn:li:activity:([^/?]+)/);
      if (feedMatch) {
        return feedMatch[1];
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении LinkedIn post ID:', error);
    return null;
  }
}

/**
 * Преобразует LinkedIn URL в embed URL
 */
export function convertToLinkedInEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('linkedin.com')) {
      // LinkedIn использует embed через oEmbed API
      // Формат: linkedin.com/embed/feed/update/urn:li:share:POST_ID
      const pathMatch = urlObj.pathname.match(/\/posts\/([^/?]+)/);
      if (pathMatch) {
        const encodedUrl = encodeURIComponent(url);
        return `https://www.linkedin.com/embed/feed/update/${encodedUrl}`;
      }

      // Альтернативный формат для прямых ссылок
      const encodedUrl = encodeURIComponent(url);
      return `https://www.linkedin.com/embed/feed/update/${encodedUrl}`;
    }

    return null;
  } catch (error) {
    console.error('Ошибка при конвертации LinkedIn URL:', error);
    return null;
  }
}

/**
 * Извлекает pin ID из Pinterest URL
 * Поддерживает форматы:
 * - https://www.pinterest.com/pin/PIN_ID/
 * - https://pinterest.com/pin/PIN_ID/
 */
export function extractPinterestPinId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('pinterest.com')) {
      // Формат: pinterest.com/pin/PIN_ID
      const match = urlObj.pathname.match(/\/pin\/(\d+)/);
      if (match) {
        return match[1];
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении Pinterest pin ID:', error);
    return null;
  }
}

/**
 * Преобразует Pinterest URL в embed URL
 */
export function convertToPinterestEmbedUrl(url: string): string | null {
  const pinId = extractPinterestPinId(url);
  if (!pinId) {
    return null;
  }
  return `https://assets.pinterest.com/ext/embed.html?id=${pinId}`;
}

/**
 * Извлекает post ID из Reddit URL
 * Поддерживает форматы:
 * - https://www.reddit.com/r/SUBREDDIT/comments/POST_ID/
 * - https://reddit.com/r/SUBREDDIT/comments/POST_ID/TITLE/
 */
export function extractRedditPostId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('reddit.com')) {
      // Формат: reddit.com/r/SUBREDDIT/comments/POST_ID/
      const match = urlObj.pathname.match(/\/comments\/([a-zA-Z0-9]+)/);
      if (match) {
        return match[1];
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении Reddit post ID:', error);
    return null;
  }
}

/**
 * Преобразует Reddit URL в embed URL
 */
export function convertToRedditEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('reddit.com')) {
      // Reddit использует embed.reddit.com для встраивания
      // Формат: embed.reddit.com/r/SUBREDDIT/comments/POST_ID/TITLE/
      const pathMatch = urlObj.pathname.match(/\/r\/([^/]+)\/comments\/([^/]+)/);
      if (pathMatch) {
        const subreddit = pathMatch[1];
        const postId = pathMatch[2];
        return `https://embed.reddit.com/r/${subreddit}/comments/${postId}/`;
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при конвертации Reddit URL:', error);
    return null;
  }
}

/**
 * Извлекает post ID из Tumblr URL
 * Поддерживает форматы:
 * - https://www.tumblr.com/blog/POST_ID
 * - https://BLOG.tumblr.com/post/POST_ID
 */
export function extractTumblrPostId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('tumblr.com')) {
      // Формат: tumblr.com/blog/POST_ID или BLOG.tumblr.com/post/POST_ID
      const match = urlObj.pathname.match(/\/(?:post|blog)\/(\d+)/);
      if (match) {
        return match[1];
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении Tumblr post ID:', error);
    return null;
  }
}

/**
 * Преобразует Tumblr URL в embed URL
 */
export function convertToTumblrEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('tumblr.com')) {
      // Tumblr использует oEmbed API через embed.tumblr.com
      return `https://embed.tumblr.com/embed/post/${encodeURIComponent(url)}`;
    }

    return null;
  } catch (error) {
    console.error('Ошибка при конвертации Tumblr URL:', error);
    return null;
  }
}

/**
 * Извлекает track ID из SoundCloud URL
 * Поддерживает форматы:
 * - https://soundcloud.com/USERNAME/TRACK_NAME
 * - https://soundcloud.com/USERNAME/TRACK_NAME?si=...
 */
export function extractSoundCloudTrackId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('soundcloud.com')) {
      // Формат: soundcloud.com/USERNAME/TRACK_NAME
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        // Возвращаем полный путь для использования в embed
        return urlObj.pathname;
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении SoundCloud track ID:', error);
    return null;
  }
}

/**
 * Преобразует SoundCloud URL в embed URL
 */
export function convertToSoundCloudEmbedUrl(url: string): string | null {
  const trackPath = extractSoundCloudTrackId(url);
  if (!trackPath) {
    return null;
  }
  // SoundCloud использует embed через w.soundcloud.com/player
  const encodedUrl = encodeURIComponent(url);
  return `https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
}

/**
 * Извлекает track/album/playlist ID из Spotify URL
 * Поддерживает форматы:
 * - https://open.spotify.com/track/TRACK_ID
 * - https://open.spotify.com/album/ALBUM_ID
 * - https://open.spotify.com/playlist/PLAYLIST_ID
 * - https://open.spotify.com/episode/EPISODE_ID
 */
export function extractSpotifyId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('spotify.com')) {
      // Формат: spotify.com/track/ID, spotify.com/album/ID, spotify.com/playlist/ID, spotify.com/episode/ID
      const match = urlObj.pathname.match(/\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
      if (match) {
        return `${match[1]}/${match[2]}`;
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении Spotify ID:', error);
    return null;
  }
}

/**
 * Преобразует Spotify URL в embed URL
 */
export function convertToSpotifyEmbedUrl(url: string): string | null {
  const spotifyId = extractSpotifyId(url);
  if (!spotifyId) {
    return null;
  }
  return `https://open.spotify.com/embed/${spotifyId}`;
}

/**
 * Извлекает track/album ID из Apple Music URL
 * Поддерживает форматы:
 * - https://music.apple.com/album/ALBUM_NAME/ID
 * - https://music.apple.com/song/TRACK_NAME/ID
 */
export function extractAppleMusicId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('apple.com') && urlObj.pathname.includes('/music')) {
      // Формат: music.apple.com/album/ALBUM_NAME/ID или music.apple.com/song/TRACK_NAME/ID
      const match = urlObj.pathname.match(/\/(album|song)\/[^/]+\/(\d+)/);
      if (match) {
        return match[2];
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при извлечении Apple Music ID:', error);
    return null;
  }
}

/**
 * Преобразует Apple Music URL в embed URL
 */
export function convertToAppleMusicEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('apple.com') && urlObj.pathname.includes('/music')) {
      // Apple Music использует embed через music.apple.com с параметрами
      return `https://embed.music.apple.com${urlObj.pathname}?embed=true`;
    }

    return null;
  } catch (error) {
    console.error('Ошибка при конвертации Apple Music URL:', error);
    return null;
  }
}

/**
 * Преобразует Google URL в embed URL
 * Поддерживает Google Drive, Google Photos и другие сервисы Google
 */
export function convertToGoogleEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('google.com')) {
      // Google Drive: drive.google.com/file/d/FILE_ID/view
      if (urlObj.hostname.includes('drive.google.com')) {
        const fileMatch = urlObj.pathname.match(/\/file\/d\/([^/]+)/);
        if (fileMatch) {
          return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
        }
      }

      // Google Photos: photos.google.com/share/...
      if (urlObj.hostname.includes('photos.google.com')) {
        return `https://photos.google.com/share/${encodeURIComponent(url)}`;
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при конвертации Google URL:', error);
    return null;
  }
}

/**
 * Преобразует Microsoft URL в embed URL
 * Поддерживает Microsoft Stream, OneDrive и другие сервисы Microsoft
 */
export function convertToMicrosoftEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (
      urlObj.hostname.includes('microsoft.com') ||
      urlObj.hostname.includes('microsoftstream.com')
    ) {
      // Microsoft Stream: web.microsoftstream.com/video/VIDEO_ID
      if (
        urlObj.hostname.includes('microsoftstream.com') ||
        urlObj.hostname.includes('stream.microsoft.com')
      ) {
        const videoMatch = urlObj.pathname.match(/\/video\/([^/?]+)/);
        if (videoMatch) {
          return `https://web.microsoftstream.com/embed/video/${videoMatch[1]}`;
        }
      }

      // OneDrive: onedrive.live.com/embed?...
      if (urlObj.hostname.includes('onedrive.live.com')) {
        return `https://onedrive.live.com/embed?${urlObj.search.substring(1)}`;
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка при конвертации Microsoft URL:', error);
    return null;
  }
}
