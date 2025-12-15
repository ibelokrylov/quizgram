interface VKPlayerProps {
  url: string;
}

export const VKPlayer = ({ url }: VKPlayerProps) => {
  // https://vk.com/video-21665793_456243052
  const [oid, id] = url.replace('https://vk.com/video', '').split('_');
  const src = `https://vk.ru/video_ext.php?oid=${oid}&amp;&id=${id}&amp;&hd=2&amp;&js_api=1&amp;&loop=0`;
  const link = `https://vk.ru/video_ext.php?oid=${oid}&amp;&id=${id}`;
  console.log(src);

  // VK Player требует нестандартные атрибуты iframe для работы плеера
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vkPlayerAttrs: any = {
    adplaying: 'false',
    link: link,
    nativeplayer: '',
  };

  return (
    <div className='player'>
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore - VK Player требует нестандартные атрибуты iframe (adplaying, link, nativeplayer) для работы плеера */}
      <iframe
        src={src}
        allow='autoplay; encrypted-media;'
        frameBorder='0'
        {...vkPlayerAttrs}
      ></iframe>
    </div>
  );
};
