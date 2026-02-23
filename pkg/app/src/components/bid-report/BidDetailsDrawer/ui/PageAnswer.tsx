const PageAnswer = ({
  text,
  url,
  contentType,
  t,
}: {
  text: string | null;
  url: string | null;
  contentType: string | null;
  t: (key: string) => string;
}) => (
  <div className="text-xs lg:text-sm bg-muted p-3 rounded-md space-y-3 md:flex md:flex-col md:items-center md:justify-center">
    {text && <p className="text-xs lg:text-sm font-medium md:text-center">{text}</p>}
    {url && (
      <div className="md:flex md:justify-center md:w-full">
        {contentType === 'img' ? (
          <img
            src={url}
            alt={t('bids.details.image')}
            className="rounded-md max-w-full h-auto object-contain md:mx-auto"
          />
        ) : (
          <div className="rounded-md overflow-hidden md:mx-auto md:max-w-2xl">
            <iframe
              src={url}
              className="w-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={t('bids.details.video')}
            />
          </div>
        )}
      </div>
    )}
  </div>
);

export default PageAnswer;
