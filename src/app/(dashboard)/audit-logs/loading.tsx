import { getTranslations } from "next-intl/server";

/** The audit page's shape while the first read is on its way. */
export default async function AuditLogsLoading() {
  const t = await getTranslations("audit");
  const bar = "rounded-sm bg-sand-deep";
  return (
    <div aria-busy className="mx-auto flex max-w-7xl animate-pulse flex-col gap-5" role="status">
      <span className="sr-only">{t("loading")}</span>
      <div className="flex flex-col gap-2">
        <div className={`${bar} h-3 w-24`} />
        <div className="h-7 w-48 rounded-md bg-sand-deep" />
        <div className={`${bar} h-3 w-96 max-w-full`} />
      </div>

      <div className="panel flex flex-wrap overflow-hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="min-w-38 flex-1 border-line px-4 py-3 not-last:border-r" key={index}>
            <div className={`${bar} h-3 w-16`} />
            <div className="mt-2 h-6 w-12 rounded-md bg-sand-deep" />
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="grid gap-2 border-b border-line p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_12.5rem] xl:grid-cols-[minmax(13rem,1fr)_10rem_9rem_11rem_12.5rem]">
          {Array.from({ length: 5 }, (_, index) => (
            <div className={`h-8 rounded-md bg-sand-deep ${index === 0 ? "sm:col-span-2 lg:col-span-4 xl:col-span-1" : ""}`} key={index} />
          ))}
        </div>
        <div className="h-9 border-b border-line bg-sand" />
        <div className="divide-y divide-line">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="flex items-center gap-6 px-4 py-3" key={index}>
              <div className={`${bar} h-3.5 w-12`} />
              <div className="hidden h-5 w-20 rounded-full bg-sand-deep xl:block" />
              <div className={`${bar} h-3.5 flex-1`} />
              <div className={`${bar} hidden h-3.5 w-32 xl:block`} />
              <div className={`${bar} hidden h-3.5 w-40 xl:block`} />
              <div className={`${bar} size-6`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
