export const VariantImageTextAnswer = ({
  imageUrl,
  text,
  t,
}: {
  imageUrl: string | null;
  text: string | null;
  t: (key: string) => string;
}) => {
  if (imageUrl) {
    return (
      <div className="text-xs lg:text-sm bg-muted p-3 rounded-md">
        <div className="space-y-2 md:flex md:flex-col md:items-center md:justify-center">
          <img
            src={imageUrl}
            alt={t('bids.details.answer')}
            className="rounded-lg max-w-95 max-h-76.75 w-full h-auto object-contain md:mx-auto"
          />
          {text && <p className="text-xs lg:text-sm font-medium md:text-center">{text}</p>}
        </div>
      </div>
    );
  }

  if (text) {
    return (
      <div className="text-xs lg:text-sm bg-muted p-3 rounded-md overflow-auto">
        <p className="text-xs lg:text-sm font-medium md:text-center">{text}</p>
      </div>
    );
  }

  return null;
};
