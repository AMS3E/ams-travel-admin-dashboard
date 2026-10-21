import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/* Reads src/i18n/request.ts: the language and its texts for every request. */
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },

  /* Picture links saved under the media service's older paths still open. */
  async redirects() {
    return [
      /* My Content is All Destinations' "Created by me" filter now. */
      { source: "/my-content", destination: "/destinations", permanent: false },
      /* The API has no badge periods of their own any more: a season sets every badge's period. */
      { source: "/badge-periods/:path*", destination: "/seasons", permanent: false },
      { source: "/api/v1/images/:path*", destination: "/api/v1/media/files/:path*", permanent: true },
      { source: "/api/v1/medias/:path*", destination: "/api/v1/media/files/:path*", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
