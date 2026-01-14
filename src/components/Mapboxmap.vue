<template>
  <div ref="mapContainer" class="mapbox-map"></div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from '../lib/findBoundaryByName.js';

export default {
  name: 'MapboxMap',
  props: {
    location: Object, // { lng, lat, bbox }
    markerLocation: Object, // { lng, lat } for red marker
    rotation: Number // Rotation angle in degrees
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
    },
    rotation(newRotation) {
      console.log('Rotation changed to:', newRotation);
      if (this.map) {
        this.map.setBearing(newRotation);
      }
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
          // Use light style which shows roads very clearly
          style: 'mapbox://styles/mapbox/light-v11',
          center: [-98.5795, 39.8283],
          zoom: 3,
          pitch: 0,
          bearing: this.rotation || 0
        });

        console.log('✅ Map instance created');

        // Wait for style to fully load
        this.map.on('style.load', () => {
          console.log('✅ Style loaded');
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

        // Add navigation controls
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        
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
      }
      
      // If we have initial marker, show it
      if (this.markerLocation) {
        this.updateMarker(this.markerLocation);
      }
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
            padding: 50,
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
        this.marker = new mapboxgl.Marker({ 
          color: '#FF0000',
          scale: 1.2
        })
          .setLngLat([markerLocation.lng, markerLocation.lat])
          .addTo(this.map);
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