# City Heart

A visualization tool that renders every single road in any city at once, creating beautiful map art from OpenStreetMap data.

![demo](https://i.imgur.com/6bFhX3e.png)

## How it Works

The application fetches road data from OpenStreetMap using the [Overpass API](http://overpass-turbo.eu/). The API is free to use under ODbL licenses, though it can be rate-limited during heavy use.

Location search is powered by [Nominatim](https://nominatim.openstreetmap.org/), which converts place names into OpenStreetMap area IDs that are then used to query road data.

## Features

- Search any city or location by name
- Visualize all roads in the selected area
- Customize colors and styling
- Export high-resolution images
- Scripting API for advanced customization (see API.md)

## Limitations

Rendering is limited by browser and GPU memory:
- Most cities render without issues
- Very large areas (like entire US states) may cause performance issues or crashes
- Mobile devices may struggle with cities containing over 1 million road segments

## Technical Stack

- Vue.js 3
- WebGL for rendering
- OpenStreetMap data via Overpass API
- Nominatim for geocoding

## Local Development

```bash
# Install dependencies
npm install

# Run development server at localhost:5173
npm run dev

# Build for production
npm run build
```

## License

The source code is licensed under MIT license.

Original city-roads project by [Andrei Kashcha](https://github.com/anvaka/city-roads).

