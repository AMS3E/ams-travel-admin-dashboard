import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="panel max-w-sm p-6 text-center">
        <p className="text-xs font-medium text-muted">404</p>
        <h1 className="heading mt-2 text-xl font-semibold text-ink">
          There is nothing here
        </h1>
        <p className="mt-2 text-sm text-muted">
          The row or screen you followed does not exist. It may have been deleted
          since the link was made.
        </p>
        <Link className={buttonVariants({ className: "mt-5" })} href="/">
          Back to the overview
        </Link>
      </div>
    </div>
  );
}
