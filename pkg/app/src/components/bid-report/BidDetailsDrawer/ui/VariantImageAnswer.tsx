export const VariantImageAnswer = ({
  imageUrl,
  t,
}: {
  imageUrl: string;
  t: (key: string) => string;
}) => (
  <div className="text-xs lg:text-sm bg-muted p-3 rounded-md overflow-auto">
    <div className="flex justify-center">
      <img
        src={imageUrl}
        alt={t("bids.details.answer")}
        className="rounded-md w-64 h-64 object-cover"
      />
    </div>
  </div>
);
