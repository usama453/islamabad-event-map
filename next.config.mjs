const nextConfig = {
  transpilePackages: ["mapbox-gl"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "dl.airtable.com",
      },
      {
        protocol: "https",
        hostname: "v5.airtableusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.airtableusercontent.com",
      },
    ],
  },
};

export default nextConfig;
