import request from './request.js';

let cachedResults = new Map();
let boundaryCache = new Map();

// Mapbox configuration
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_GEOCODING_API = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

export { MAPBOX_TOKEN }; // Export for use in other modules

export default function findBoundaryByName(inputName) {
  let results = cachedResults.get(inputName);
  if (results) return Promise.resolve(results);

  let name = encodeURIComponent(inputName);

  // Use Mapbox Geocoding API
  return request(`${MAPBOX_GEOCODING_API}/${name}.json?access_token=${MAPBOX_TOKEN}&types=place,address,locality,region`, {
    responseType: 'json'
  })
    .then(extractFromMapbox)
    .then(x => {
      cachedResults.set(inputName, x);
      return x;
    });
}

// Fetch actual boundary geometry from OpenStreetMap
export async function fetchBoundaryGeometry(placeName) {
  // Check cache first
  if (boundaryCache.has(placeName)) {
    return boundaryCache.get(placeName);
  }

  try {
    // Search for the place to get OSM ID
    const searchUrl = `${NOMINATIM_API}/search?q=${encodeURIComponent(placeName)}&format=json&polygon_geojson=1&limit=1`;
    const searchResults = await request(searchUrl, {
      responseType: 'json',
      headers: {
        'User-Agent': 'CityHeart/1.0'
      }
    });

    if (!searchResults || searchResults.length === 0) {
      console.warn('No boundary found for:', placeName);
      return null;
    }

    const result = searchResults[0];

    // Check if we got a polygon
    if (result.geojson && (result.geojson.type === 'Polygon' || result.geojson.type === 'MultiPolygon')) {
      const boundary = result.geojson;
      boundaryCache.set(placeName, boundary);
      return boundary;
    }

    console.warn('No polygon geometry found for:', placeName);
    return null;
  } catch (error) {
    console.error('Error fetching boundary:', error);
    return null;
  }
}

function extractFromMapbox(mapboxResponse) {
  if (!mapboxResponse.features || mapboxResponse.features.length === 0) {
    return [];
  }
  
  return mapboxResponse.features.map(feature => {
    // Mapbox bbox format: [west, south, east, north]
    const bbox = feature.bbox ? {
      west: feature.bbox[0],
      south: feature.bbox[1],
      east: feature.bbox[2],
      north: feature.bbox[3]
    } : null;
    
    // Extract city name from context (for addresses)
    let cityName = null;
    let regionName = null;
    
    if (feature.context) {
      const placeContext = feature.context.find(c => c.id.startsWith('place'));
      const regionContext = feature.context.find(c => c.id.startsWith('region'));
      
      cityName = placeContext?.text;
      regionName = regionContext?.text;
    }
    
    // Determine type
    const placeType = feature.place_type?.[0] || 'unknown';
    const isAddress = placeType === 'address' || placeType === 'poi';
    const isPlace = ['place', 'locality', 'region', 'district'].includes(placeType);
    
    return {
      // Mapbox-specific data
      mapboxId: feature.id,
      center: feature.center, // [lng, lat]
      lng: feature.center[0],
      lat: feature.center[1],
      bbox: bbox,
      
      // Display info
      name: feature.place_name,
      placeName: feature.text,
      type: placeType,
      
      // Context
      cityName: cityName,
      regionName: regionName,
      
      // Flags
      isAddress: isAddress,
      isPlace: isPlace
    };
  });
}