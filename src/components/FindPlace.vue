<template>
<div class='find-place' :class='{centered: boxInTheMiddle }'>
  <div v-if='boxInTheMiddle'>
    <h3 class='site-header'>City Heart</h3>
    <p class='description'>Visualize roads in any city or address</p>
  </div>
  
  <form v-on:submit.prevent="onSubmit" class='search-box'>
    <input 
      class='query-input' 
      v-model='enteredInput' 
      type='text' 
      placeholder='Enter a city name or address' 
      ref='input'
    >
    <a 
      type='submit' 
      class='search-submit' 
      href='#' 
      @click.prevent='onSubmit' 
      v-if='enteredInput && !hideInput'
    >
      Search
    </a>
  </form>
  
  <div class='results' v-if='!loading'>
    <div v-if='suggestionsLoaded && suggestions.length' class='suggestions shadow'>
      <div class='prompt message'>
        <div>Select a location to view its roads</div>
      </div>
      <ul>
        <li v-for='(suggestion, index) in suggestions' :key="index">
          <a @click.prevent='pickSuggestion(suggestion)' class='suggestion' href='#'>
            <span>{{ suggestion.name }}</span>
            <small class='type-badge'>{{ suggestion.type }}</small>
          </a>
        </li>
      </ul>
    </div>
    
    <div v-if='suggestionsLoaded && !suggestions.length && !loading && !error' class='no-results message shadow'>
      No results found. Try a different search?
    </div>
  </div>
  
  <div v-if='error' class='error message shadow'>
    <div>{{ error }}</div>
  </div>
  
  <div v-if='loading' class='loading message shadow'>
    <div class='loading-spinner'></div>
    <span>{{ loading }}</span>
  </div>
</div>
</template>

<script>
import findBoundaryByName from '../lib/findBoundaryByName.js';

export default {
  name: 'FindPlace',
  data() {
    return {
      enteredInput: '',
      suggestions: [],
      suggestionsLoaded: false,
      loading: null,
      error: null,
      hideInput: false,
      boxInTheMiddle: true
    };
  },
  mounted() {
    this.$refs.input.focus();
  },
  methods: {
    onSubmit() {
      if (!this.enteredInput.trim()) return;
      
      this.suggestions = [];
      this.error = null;
      this.loading = 'Searching...';
      
      findBoundaryByName(this.enteredInput)
        .then(results => {
          this.loading = null;
          this.hideInput = results && results.length;
          
          if (this.boxInTheMiddle) {
            this.boxInTheMiddle = false;
            setTimeout(() => {
              this.suggestionsLoaded = true;
              this.suggestions = results;
            }, 50);
          } else {
            this.suggestionsLoaded = true;
            this.suggestions = results;
          }
        })
        .catch(err => {
          this.loading = null;
          this.error = 'Failed to search. Please try again.';
          console.error('Search error:', err);
        });
    },
    
    pickSuggestion(suggestion) {
      console.log('=== PICK SUGGESTION ===');
      console.log('Selected:', suggestion);
      console.log('isAddress:', suggestion.isAddress);
      console.log('isPlace:', suggestion.isPlace);
      
      // Check if this is an address
      if (suggestion.isAddress) {
        console.log('→ Handling as ADDRESS');
        // Address selected - need to find the city first
        this.loading = 'Finding city for address...';
        this.handleAddressSelection(suggestion);
      } else {
        console.log('→ Handling as CITY/PLACE');
        // City/place selected directly
        this.emitLocation(suggestion);
      }
    },
    
    handleAddressSelection(addressSuggestion) {
      console.log('=== HANDLE ADDRESS ===');
      // Extract city name from the address
      const cityName = addressSuggestion.cityName || this.extractCityFromName(addressSuggestion.name);
      console.log('Extracted city name:', cityName);
      
      if (!cityName) {
        console.log('→ No city found, showing address location');
        // No city found, just show the address location
        this.emitLocation(addressSuggestion, {
          markerLng: addressSuggestion.lng,
          markerLat: addressSuggestion.lat
        });
        return;
      }
      
      console.log('→ Searching for city:', cityName);
      // Search for the city
      findBoundaryByName(cityName)
        .then(cityResults => {
          console.log('City search results:', cityResults);
          // Find a place (not address) result
          const city = cityResults.find(r => r.isPlace);
          console.log('Found city:', city);
          
          if (city) {
            console.log('→ Emitting city with marker');
            // Emit city with marker at address
            this.emitLocation(city, {
              markerLng: addressSuggestion.lng,
              markerLat: addressSuggestion.lat
            });
          } else {
            console.log('→ No city found, showing address only');
            // No city found, just show address
            this.emitLocation(addressSuggestion, {
              markerLng: addressSuggestion.lng,
              markerLat: addressSuggestion.lat
            });
          }
        })
        .catch(err => {
          console.error('City search failed:', err);
          // Fallback: just show the address
          this.emitLocation(addressSuggestion, {
            markerLng: addressSuggestion.lng,
            markerLat: addressSuggestion.lat
          });
        });
    },
    
    extractCityFromName(name) {
      // Try to extract city from display name
      // Format: "Address, City, Region, Country"
      const parts = name.split(',').map(p => p.trim());
      return parts.length >= 2 ? parts[1] : null;
    },
    
    emitLocation(location, options = {}) {
      console.log('=== EMIT LOCATION ===');
      console.log('Location:', location);
      console.log('Options:', options);
      
      this.loading = null;
      
      const payload = {
        name: location.name,
        lng: location.lng,
        lat: location.lat,
        bbox: location.bbox,
        ...options
      };
      
      console.log('Emitting payload:', payload);
      this.$emit('loaded', payload);
    }
  }
};
</script>

<style scoped>
.find-place {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  z-index: 100;
  transition: all 0.3s ease;
}

.find-place.centered {
  top: 50%;
  left: 50%;
  right: auto;
  transform: translate(-50%, -50%);
  max-width: 600px;
  width: 100%;
}

.site-header {
  font-size: 48px;
  font-weight: 700;
  color: white;
  text-align: center;
  margin-bottom: 8px;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}

.description {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  margin-bottom: 32px;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.5);
}

.search-box {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.query-input {
  flex: 1;
  padding: 16px 20px;
  font-size: 16px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

.query-input:focus {
  outline: none;
  background: white;
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.3);
}

.search-submit {
  padding: 16px 32px;
  background: #4A90E2;
  color: white;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 4px 20px rgba(74, 144, 226, 0.3);
}

.search-submit:hover {
  background: #357ABD;
  transform: translateY(-2px);
  box-shadow: 0 6px 30px rgba(74, 144, 226, 0.4);
}

.message {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.suggestions ul {
  list-style: none;
  margin-top: 16px;
}

.suggestions li {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.suggestions li:last-child {
  border-bottom: none;
}

.suggestion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  color: #333;
  text-decoration: none;
  transition: all 0.2s;
}

.suggestion:hover {
  color: #4A90E2;
  padding-left: 8px;
}

.type-badge {
  background: rgba(74, 144, 226, 0.1);
  color: #4A90E2;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.prompt {
  color: #666;
  font-size: 14px;
}

.no-results, .error {
  color: #666;
  text-align: center;
}

.error {
  background: rgba(255, 107, 107, 0.1);
  color: #E74C3C;
}

.loading {
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(74, 144, 226, 0.3);
  border-top-color: #4A90E2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.shadow {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .site-header {
    font-size: 36px;
  }
  
  .description {
    font-size: 16px;
  }
  
  .search-box {
    flex-direction: column;
  }
}
</style>