interface VKPlayerProps {
  url: string;
}

export const VKPlayer = ({ url }: VKPlayerProps) => {
  // https://vk.com/video-21665793_456243052
  const [oid, id] = url.replace('https://vk.com/video', '').split('_');
  const src = `https://vk.ru/video_ext.php?oid=${oid}&amp;&id=${id}&amp;&hd=2&amp;&js_api=1&amp;&loop=0`;
  const link = `https://vk.ru/video_ext.php?oid=${oid}&amp;&id=${id}`;
  console.log(src);

  return (
    <div className='player'>
      <iframe
        src={src}
        allow='autoplay; encrypted-media;'
        frameBorder='0'
        adplaying='false'
        link={link}
        nativeplayer=''
      ></iframe>
    </div>
  );
};
