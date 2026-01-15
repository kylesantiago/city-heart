<template>
  <find-place v-if='!placeFound' @loaded='onLocationLoaded'></find-place>
  
  <div id="app" v-if='placeFound'>
    <mapbox-map
      :location='currentLocation'
      :markerLocation='markerLocation'
      @map-ready='onMapReady'
    />

    <div class='controls'>
      <a href="#" class='try-another' @click.prevent='startOver'>Try another location</a>
      <a
        v-if='!markerLocation'
        href="#"
        :class="['add-marker-btn', { 'placing-active': isPlacingMarker }]"
        @click.prevent='enableMarkerPlacement'
        :title="isPlacingMarker ? 'Click to cancel (or press Esc)' : 'Add a marker to the map'"
      >
        {{ isPlacingMarker ? '✕ Cancel' : '+ Add Marker' }}
      </a>
      <a
        v-if='markerLocation'
        href="#"
        class='remove-marker-btn'
        @click.prevent='removeMarker'
      >
        Remove Marker
      </a>
    </div>

    <div class='city-name'>{{ locationName }}</div>

    <div v-if='isPlacingMarker' class='placement-instruction'>
      Click on the map to place marker • Press ESC to cancel
    </div>

    <div class='license'>
      Map data © <a href='https://www.mapbox.com/' target="_blank">Mapbox</a>
    </div>
  </div>
</template>

<script>
import FindPlace from './components/FindPlace.vue';
import MapboxMap from './components/MapboxMap.vue';

export default {
  name: 'App',
  components: {
    FindPlace,
    MapboxMap
  },
  data() {
    return {
      placeFound: false,
      currentLocation: null,
      markerLocation: null,
      locationName: '',
      map: null,
      isPlacingMarker: false
    };
  },
  methods: {
    onLocationLoaded(locationData) {
      console.log('Location loaded:', locationData);

      this.placeFound = true;
      this.locationName = locationData.displayName || locationData.name;

      // Set map location (includes name for boundary fetching)
      this.currentLocation = {
        name: locationData.name, // City name for boundary fetch
        lng: locationData.lng,
        lat: locationData.lat,
        bbox: locationData.bbox
      };

      // Set marker if it's an address
      if (locationData.markerLng && locationData.markerLat) {
        this.markerLocation = {
          lng: locationData.markerLng,
          lat: locationData.markerLat
        };
      } else {
        this.markerLocation = null;
      }
    },

    onMapReady(mapInstance) {
      this.map = mapInstance;
      console.log('Map ready');
    },

    startOver() {
      this.placeFound = false;
      this.currentLocation = null;
      this.markerLocation = null;
      this.locationName = '';
    },

    enableMarkerPlacement() {
      if (!this.map) return;

      // If already placing, cancel it
      if (this.isPlacingMarker) {
        this.cancelMarkerPlacement();
        return;
      }

      // Set placing state
      this.isPlacingMarker = true;

      // Set cursor to crosshair
      const mapContainer = this.map.getCanvas();
      mapContainer.style.cursor = 'crosshair';

      // One-time click handler
      const handleClick = (e) => {
        const { lng, lat } = e.lngLat;
        this.markerLocation = { lng, lat };

        // Reset cursor and state
        mapContainer.style.cursor = '';
        this.isPlacingMarker = false;

        // Remove handlers
        this.map.off('click', handleClick);
        document.removeEventListener('keydown', handleEscape);

        console.log('📍 Marker placed at:', { lng, lat });
      };

      // Escape key handler to cancel
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          this.cancelMarkerPlacement();
          this.map.off('click', handleClick);
          document.removeEventListener('keydown', handleEscape);
        }
      };

      this.map.on('click', handleClick);
      document.addEventListener('keydown', handleEscape);
    },

    cancelMarkerPlacement() {
      if (!this.isPlacingMarker) return;

      const mapContainer = this.map.getCanvas();
      mapContainer.style.cursor = '';
      this.isPlacingMarker = false;
      console.log('❌ Marker placement cancelled');
    },

    removeMarker() {
      this.markerLocation = null;
      console.log('🗑️ Marker removed');
    }
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

#app {
  width: 100%;
  height: 100%;
  position: relative;
}

.controls {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  display: flex;
  gap: 12px;
}

.try-another, .add-marker-btn, .remove-marker-btn {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  display: inline-block;
}

.try-another:hover, .add-marker-btn:hover, .remove-marker-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: translateY(-2px);
}

.add-marker-btn {
  background: rgba(255, 0, 0, 0.8);
}

.add-marker-btn:hover {
  background: rgba(255, 0, 0, 0.9);
}

.add-marker-btn.placing-active {
  background: rgba(255, 100, 0, 0.95);
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(255, 100, 0, 0.7);
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 100, 0, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 100, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 100, 0, 0);
  }
}

.remove-marker-btn {
  background: rgba(150, 150, 150, 0.8);
}

.remove-marker-btn:hover {
  background: rgba(150, 150, 150, 0.9);
}

.city-name {
  position: absolute;
  top: 30px;
  left: 30px;
  z-index: 10;
  font-size: 32px;
  font-weight: 700;
  color: #000000;
  text-shadow: none;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px 20px;
  border-radius: 4px;
}

.placement-instruction {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
  background: rgba(255, 100, 0, 0.95);
  color: white;
  padding: 20px 40px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  pointer-events: none;
  box-shadow: 0 8px 32px rgba(255, 100, 0, 0.4);
  animation: fadeInScale 0.3s ease-out;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.license {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10;
  font-size: 12px;
  color: #666666;
  text-shadow: none;
  background: rgba(255, 255, 255, 0.9);
  padding: 5px 10px;
  border-radius: 4px;
}

.license a {
  color: #000000;
  text-decoration: none;
}

.license a:hover {
  text-decoration: underline;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .city-name {
    font-size: 24px;
    top: 20px;
    left: 20px;
  }

  .controls {
    top: 10px;
    right: 10px;
    flex-direction: column;
    align-items: flex-end;
  }

  .try-another, .add-marker-btn, .remove-marker-btn {
    padding: 10px 20px;
    font-size: 13px;
  }

  .placement-instruction {
    padding: 16px 24px;
    font-size: 14px;
    max-width: 80%;
    text-align: center;
  }
}
</style>