import request from './request.js';

let cachedResults = new Map();

export default function findBoundaryByName(inputName) {
  let results = cachedResults.get(inputName);
  if (results) return Promise.resolve(results);

  let name = encodeURIComponent(inputName);
  return request(`https://nominatim.openstreetmap.org/search?format=json&q=${name}`, {responseType: 'json'})
      .then(extractBoundaries)
      .then(x => {
        cachedResults.set(inputName, x);
        return x;
      });
}

function extractBoundaries(x) {
  let areas = x.map(row => {
      let areaId, bbox;
      if (row.osm_type === 'relation') {
        areaId = row.osm_id + 36e8;
      } else if (row.osm_type === 'way') {
        areaId = row.osm_id + 24e8;
      }
      if (row.boundingbox) {
        bbox = [
          Number.parseFloat(row.boundingbox[0]),
          Number.parseFloat(row.boundingbox[2]),
          Number.parseFloat(row.boundingbox[1]),
          Number.parseFloat(row.boundingbox[3]),
        ];
      }

      return {
        areaId,
        bbox,
        lat: row.lat,
        lon: row.lon,
        osmId: row.osm_id,
        osmType: row.osm_type,
        name: row.display_name,
        type: row.type,
      };
    });

  return areas;
}