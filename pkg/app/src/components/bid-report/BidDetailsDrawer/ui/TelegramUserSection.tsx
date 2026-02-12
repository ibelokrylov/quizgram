const TelegramUserSection = ({
  userInfo,
  t,
}: {
  userInfo: any;
  t: (key: string) => string;
}) => (
  <div className="space-y-3 pt-4 border-t">
    <h3 className="font-semibold text-base lg:text-lg">
      {t("bids.details.telegramUser")}
    </h3>
    <div className="space-y-2">
      <pre className="text-xs lg:text-sm bg-muted p-3 rounded-md overflow-auto">
        {JSON.stringify(userInfo, null, 2)}
      </pre>
    </div>
    <a href={`https://t.me/${userInfo?.username}`}>
      https://t.me/{userInfo?.username}
    </a>
  </div>
);

export default TelegramUserSection;
