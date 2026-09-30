/**
 * Every dashboard screen waits on the same thing — a round trip to Spring Boot
 * — so one skeleton in the shape of a header plus a panel covers all of them.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-7xl animate-pulse flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 rounded-sm bg-sand-deep" />
        <div className="h-7 w-56 rounded-md bg-sand-deep" />
        <div className="h-3 w-80 max-w-full rounded-sm bg-sand-deep" />
      </div>

      <div className="panel flex flex-col gap-2 p-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="h-9 rounded-md bg-sand-deep" key={index} />
        ))}
      </div>
    </div>
  );
}
