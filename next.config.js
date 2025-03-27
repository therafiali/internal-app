/** @type {import('next').NextConfig} */
const nextConfig = {
   
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'app.manychat.com',contentdispositiontype: 'inline', // Optional: Adjust content disposition
      },
      {
        protocol: 'https',
        hostname: 'example.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.pixabay.com',
      },
      {
        protocol: 'https',
        hostname: 'qgixcznoxktrxdcytyxo.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;



module.exports = { typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true },
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'app.manychat.com',
    },
    {
      protocol: 'https',
      hostname: 'example.com',
    },
    {
      protocol: 'https',
      hostname: 'ui-avatars.com',
    },
    {
      protocol: 'https',
      hostname: 'cdn.pixabay.com',
    },
    {
      protocol: 'https',
      hostname: 'qgixcznoxktrxdcytyxo.supabase.co',
    },
  ],
},



}