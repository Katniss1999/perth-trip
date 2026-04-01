// Cloudflare Pages Function: OSM tile proxy
// URL pattern: /tile/{z}/{x}/{y}.png
// Proxies OSM tiles through Cloudflare CDN for China accessibility

const TILE_SOURCES = [
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
];

export async function onRequest(context) {
  const { params } = context;
  // params.path is an array like ["8", "155", "228.png"]
  const pathParts = params.path;

  if (!pathParts || pathParts.length < 3) {
    return new Response('Bad request: /tile/{z}/{x}/{y}.png', { status: 400 });
  }

  const z = pathParts[0];
  const x = pathParts[1];
  const yRaw = pathParts[2];
  const y = yRaw.replace('.png', '');

  // Pick a random source for load distribution
  const sourceTemplate = TILE_SOURCES[Math.floor(Math.random() * TILE_SOURCES.length)];
  const tileUrl = sourceTemplate
    .replace('{z}', z)
    .replace('{x}', x)
    .replace('{y}', y);

  try {
    const response = await fetch(tileUrl, {
      headers: {
        'User-Agent': 'PerThTrip-TileProxy/1.0',
        'Accept': 'image/png,image/*',
      },
      cf: {
        // Cache tile on Cloudflare edge for 7 days
        cacheTtl: 604800,
        cacheEverything: true,
      },
    });

    if (!response.ok) {
      return new Response('Tile not found', { status: response.status });
    }

    const tileData = await response.arrayBuffer();

    return new Response(tileData, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800, s-maxage=604800',
        'Access-Control-Allow-Origin': '*',
        'X-Tile-Source': 'osm-proxy',
      },
    });
  } catch (err) {
    return new Response('Tile proxy error: ' + err.message, { status: 502 });
  }
}
