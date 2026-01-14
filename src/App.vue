<template>
  <find-place v-if='!placeFound' @loaded='onLocationLoaded'></find-place>
  
  <div id="app" v-if='placeFound'>
    <mapbox-map 
      :location='currentLocation' 
      :markerLocation='markerLocation'
      :rotation='rotation'
      @map-ready='onMapReady'
    />
    
    <div class='controls'>
      <a href="#" class='try-another' @click.prevent='startOver'>Try another location</a>
    </div>
    
    <!-- Rotation controls -->
    <div class='rotation-control-panel'>
      <div class='rotation-controls'>
        <label class='rotation-label'>Rotate</label>
        <input 
          type='range' 
          v-model.number='rotation' 
          min='0' 
          max='360' 
          step='0.1' 
          class='rotation-slider' 
        />
        <span class='rotation-value'>{{Math.round(rotation)}}°</span>
        <button @click='resetRotation' class='reset-btn' title='Reset rotation'>↻</button>
      </div>
    </div>
    
    <div class='city-name'>{{ locationName }}</div>
    <div class='license'>
      Map data © <a href='https://www.mapbox.com/' target="_blank">Mapbox</a>
    </div>
  </div>
</template>

<script>
import FindPlace from './components/FindPlace.vue';
import MapboxMap from './components/Mapboxmap.vue';

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
      rotation: 0,
      map: null
    };
  },
  methods: {
    onLocationLoaded(locationData) {
      console.log('Location loaded:', locationData);
      
      this.placeFound = true;
      this.locationName = locationData.name;
      
      // Set map location
      this.currentLocation = {
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
      this.rotation = 0;
    },
    
    resetRotation() {
      this.rotation = 0;
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
}

.try-another {
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

.try-another:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: translateY(-2px);
}

.rotation-control-panel {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.rotation-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rotation-label {
  color: white;
  font-size: 14px;
  font-weight: 500;
  min-width: 60px;
}

.rotation-slider {
  width: 200px;
  height: 6px;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.2);
}

.rotation-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
}

.rotation-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.rotation-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.rotation-value {
  color: white;
  font-size: 14px;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

.reset-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(180deg);
}

.city-name {
  position: absolute;
  top: 30px;
  left: 30px;
  z-index: 10;
  font-size: 32px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.license {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.license a {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
}

.license a:hover {
  text-decoration: underline;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .rotation-control-panel {
    bottom: 20px;
    left: 10px;
    right: 10px;
    transform: none;
  }
  
  .rotation-slider {
    width: 150px;
  }
  
  .city-name {
    font-size: 24px;
    top: 20px;
    left: 20px;
  }
  
  .controls {
    top: 10px;
    right: 10px;
  }
}
</style>