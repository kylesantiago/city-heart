<template>
  <div ref="mapContainer" class="mapbox-map"></div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, fetchBoundaryGeometry } from '../lib/findBoundaryByName.js';

export default {
  name: 'MapboxMap',
  props: {
    location: Object, // { lng, lat, bbox }
    markerLocation: Object // { lng, lat } for red marker
  },
  data() {
    return {
      map: null,
      marker: null
    };
  },
  mounted() {
    this.initializeMap();
  },
  beforeUnmount() {
    if (this.map) {
      this.map.remove();
    }
  },
  watch: {
    location(newLocation, oldLocation) {
      console.log('=== LOCATION PROP CHANGED ===');
      console.log('Old:', oldLocation);
      console.log('New:', newLocation);

      if (newLocation && this.map) {
        console.log('Map exists, updating location');
        this.updateMapLocation(newLocation);
      } else {
        console.warn('Cannot update - map:', !!this.map, 'location:', !!newLocation);
      }
    },
    markerLocation(newMarker, oldMarker) {
      console.log('=== MARKER LOCATION CHANGED ===');
      console.log('Old:', oldMarker);
      console.log('New:', newMarker);
      this.updateMarker(newMarker);
    }
  },
  methods: {
    initializeMap() {
      const token = MAPBOX_TOKEN;
      
      // Check if token is set
      if (!token || token === 'YOUR_MAPBOX_TOKEN_HERE') {
        console.error('❌ MAPBOX TOKEN NOT SET!');
        console.error('Please get a token from https://account.mapbox.com/');
        console.error('Then replace YOUR_MAPBOX_TOKEN_HERE in src/lib/findBoundaryByName.js');
        this.$emit('map-error', 'Mapbox token not configured');
        return;
      }

      mapboxgl.accessToken = token;
      console.log('✅ Mapbox token set');

      try {
        this.map = new mapboxgl.Map({
          container: this.$refs.mapContainer,
          // Use blank/minimal style - we'll add only roads
          style: {
            version: 8,
            sources: {
              'mapbox-streets': {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-streets-v8'
              }
            },
            layers: [
              // White background
              {
                id: 'background',
                type: 'background',
                paint: {
                  'background-color': '#ffffff'
                }
              },
              // Only actual roads - no paths, ferries, or trails
              {
                id: 'roads',
                type: 'line',
                source: 'mapbox-streets',
                'source-layer': 'road',
                filter: [
                  'in',
                  ['get', 'class'],
                  ['literal', [
                    'motorway',
                    'trunk',
                    'primary',
                    'secondary',
                    'tertiary',
                    'street',
                    'street_limited',
                    'motorway_link',
                    'trunk_link',
                    'primary_link',
                    'secondary_link',
                    'tertiary_link',
                    'service',
                    'track'
                  ]]
                ],
                paint: {
                  'line-color': '#000000',
                  'line-width': [
                    'interpolate',
                    ['exponential', 1.5],
                    ['zoom'],
                    10, 0.5,
                    15, 2,
                    20, 4
                  ]
                }
              }
            ]
          },
          center: [-98.5795, 39.8283],
          zoom: 3,
          pitch: 0,
          bearing: 0,
          minPitch: 0, // Lock pitch to 0 (no 3D tilt)
          maxPitch: 0, // Lock pitch to 0 (no 3D tilt)
          // Enable pan, rotate, and zoom - disable 3D tilt
          interactive: true,
          scrollZoom: true, // Mouse wheel zoom enabled
          boxZoom: true, // Shift+drag to zoom enabled
          dragRotate: true, // Right-click or Ctrl+drag to rotate
          dragPan: true, // Click and drag to pan
          keyboard: true,
          doubleClickZoom: true, // Double-click zoom enabled
          touchZoomRotate: true, // Two-finger zoom and rotate on touch
          touchPitch: false, // Disable touch pitch
          pitchWithRotate: false // Disable pitch when rotating
        });

        console.log('✅ Map instance created with minimal style');

        // Wait for style to fully load
        this.map.on('style.load', () => {
          console.log('✅ Minimal style loaded');
        });

        // Wait for map to load
        this.map.on('load', () => {
          console.log('✅ Map loaded');
          
          // Wait for style to fully load before showing location
          if (!this.map.isStyleLoaded()) {
            console.log('Waiting for style to load...');
            this.map.once('idle', () => {
              console.log('✅ Style ready, now showing location');
              this.showInitialLocation();
            });
          } else {
            this.showInitialLocation();
          }
          
          this.$emit('map-ready', this.map);
        });

        // Log any tile errors
        this.map.on('error', (e) => {
          console.error('❌ Map error:', e);
          if (e.error) {
            console.error('Error details:', e.error);
            if (e.error.status === 401) {
              console.error('❌ AUTHENTICATION ERROR - Check your Mapbox token!');
            }
          }
        });

        this.map.on('data', (e) => {
          if (e.dataType === 'source') {
            console.log('Source data loaded:', e.sourceId);
          }
          if (e.dataType === 'style') {
            console.log('Style data loaded');
          }
        });

        this.map.on('sourcedataloading', (e) => {
          console.log('Loading source data:', e.sourceId);
        });

        this.map.on('idle', () => {
          console.log('✅ Map is idle (all tiles should be loaded)');
          const canvas = this.map.getCanvas();
          console.log('Canvas size:', canvas.width, 'x', canvas.height);
          console.log('Map loaded:', this.map.loaded());
          console.log('Map style loaded:', this.map.isStyleLoaded());
        });

        // Navigation controls removed for static view

      } catch (error) {
        console.error('❌ Failed to initialize map:', error);
        this.$emit('map-error', error.message);
      }
    },

    showInitialLocation() {
      // If we have initial location, show it
      if (this.location) {
        console.log('Showing initial location:', this.location);
        this.updateMapLocation(this.location);

        // Fetch and add actual city boundary mask
        if (this.location.name) {
          this.addCityBoundaryMask(this.location.name);
        }
      }

      // If we have initial marker, show it
      if (this.markerLocation) {
        this.updateMarker(this.markerLocation);
      }
    },

    async addCityBoundaryMask(cityName) {
      console.log('🔍 Fetching actual boundary for:', cityName);

      // Fetch the actual boundary geometry from OSM
      const boundaryGeometry = await fetchBoundaryGeometry(cityName);

      if (!boundaryGeometry) {
        console.warn('⚠️ No boundary geometry found, roads will not be clipped');
        return;
      }

      console.log('✅ Boundary geometry fetched:', boundaryGeometry.type);

      // Wait for map to be idle before adding mask
      this.map.once('idle', () => {
        // Remove existing boundary layers if any
        if (this.map.getLayer('outside-mask')) {
          this.map.removeLayer('outside-mask');
        }
        if (this.map.getLayer('city-boundary-mask')) {
          this.map.removeLayer('city-boundary-mask');
        }
        if (this.map.getSource('outside-boundary')) {
          this.map.removeSource('outside-boundary');
        }
        if (this.map.getSource('city-boundary')) {
          this.map.removeSource('city-boundary');
        }

        // Add the actual boundary as a source
        this.map.addSource('city-boundary', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: boundaryGeometry
          }
        });

        // Create an inverse mask (world with a hole cut out for the city)
        const worldBounds = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]];

        // Extract coordinates from the boundary geometry
        let boundaryCoords;
        if (boundaryGeometry.type === 'Polygon') {
          boundaryCoords = boundaryGeometry.coordinates;
        } else if (boundaryGeometry.type === 'MultiPolygon') {
          // For MultiPolygon, use the largest polygon
          boundaryCoords = boundaryGeometry.coordinates[0];
        }

        // Create polygon with hole
        const maskCoordinates = [worldBounds, ...boundaryCoords];

        // Add inverse mask (everything OUTSIDE the city)
        this.map.addSource('outside-boundary', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: maskCoordinates
            }
          }
        });

        // White fill to cover roads outside the boundary
        this.map.addLayer({
          id: 'outside-mask',
          type: 'fill',
          source: 'outside-boundary',
          paint: {
            'fill-color': '#ffffff',
            'fill-opacity': 1
          }
        });

        console.log('✅ City boundary mask added - roads clipped to actual city shape!');
      });
    },

    styleMapForRoads() {
      // Light style already shows roads clearly - no modifications needed
      console.log('✅ Using default light style (roads visible)');
    },

    updateMapLocation(location) {
      if (!this.map || !location) {
        console.warn('Cannot update location - map or location missing');
        return;
      }

      console.log('=== UPDATE MAP LOCATION ===');
      console.log('Location object:', location);
      console.log('Has bbox:', !!location.bbox);
      console.log('Bbox value:', location.bbox);
      console.log('Has lng/lat:', location.lng, location.lat);

      if (location.bbox && location.bbox.west !== undefined) {
        console.log('→ Using BBOX to fit bounds');
        console.log('Bounds:', [
          [location.bbox.west, location.bbox.south],
          [location.bbox.east, location.bbox.north]
        ]);
        
        try {
          this.map.fitBounds([
            [location.bbox.west, location.bbox.south],
            [location.bbox.east, location.bbox.north]
          ], {
            padding: 0, // No padding for full-bleed city silhouette
            duration: 2000, // Slower animation so tiles can load
            essential: true // This animation is essential
          });
          console.log('✅ fitBounds called');
        } catch (e) {
          console.error('❌ fitBounds failed:', e);
        }
      } else if (location.lng && location.lat) {
        console.log('→ Using LNG/LAT to fly to location');
        console.log('Center:', [location.lng, location.lat]);
        
        try {
          this.map.flyTo({
            center: [location.lng, location.lat],
            zoom: 13,
            duration: 1000
          });
          console.log('✅ flyTo called');
        } catch (e) {
          console.error('❌ flyTo failed:', e);
        }
      } else {
        console.error('❌ No valid location data (need bbox OR lng/lat)');
      }

      // Log current map state after zoom
      setTimeout(() => {
        console.log('Current map center:', this.map.getCenter());
        console.log('Current map zoom:', this.map.getZoom());
        console.log('Current map bounds:', this.map.getBounds());
      }, 1500);
    },

    updateMarker(markerLocation) {
      // Remove existing marker
      if (this.marker) {
        this.marker.remove();
        this.marker = null;
      }

      // Add new marker if location provided
      if (markerLocation && markerLocation.lng && markerLocation.lat) {
        // Create a draggable circular marker element
        const el = document.createElement('div');
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid #FF0000';
        el.style.backgroundColor = 'transparent';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.cursor = 'grab';

        this.marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
          draggable: true // Make marker draggable
        })
          .setLngLat([markerLocation.lng, markerLocation.lat])
          .addTo(this.map);

        // Visual feedback during drag
        this.marker.on('dragstart', () => {
          el.style.cursor = 'grabbing';
          el.style.boxShadow = '0 4px 12px rgba(255, 0, 0, 0.5)';
        });

        this.marker.on('dragend', () => {
          el.style.cursor = 'grab';
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
          const lngLat = this.marker.getLngLat();
          console.log('📍 Marker moved to:', lngLat);
        });

        console.log('✅ Draggable marker added (drag to reposition)');
      }
    }
  }
};
</script>

<style scoped>
.mapbox-map {
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>