import config from '../config.js';
import tinycolor from 'tinycolor2';
import {WireCollection, PointCollection} from 'w-gl';

let counter = 0;

export default class GridLayer {
  get color() {
    return this._color;
  }

  set color(unsafeColor) {
    let color = tinycolor(unsafeColor);
    this._color = color;
    if (this.lines) {
      this.lines.color = toRatioColor(color.toRgb());
    }
    if (this.scene) {
      this.scene.renderFrame();
    }
  }

  get lineWidth() {
    return this._lineWidth;
  }

  set lineWidth(newValue) {
    this._lineWidth = newValue;
    if (!this.lines || !this.scene) return;

    this.lines.setLineWidth(newValue);
  }

  constructor() {
    this._color = config.getDefaultLineColor();
    this.grid = null;
    this.lines = null;
    this.marker = null; // For target location marker
    this.scene = null;
    this.dx = 0;
    this.dy = 0;
    this.scale = 1;
    this.angle = 0; // rotation angle in radians
    this.hidden = false;
    this.id = 'paths_' + counter;
    this._lineWidth = 1;
    counter += 1;
  }

  getGridProjector() {
    if (this.grid) return this.grid.projector;
  }

  getQueryBounds() {
    const {grid} = this;
    if (grid) {
      if (grid.queryBounds) return grid.queryBounds;
      if (grid.isArea) return {
        areaId: grid.id
      };
    }
  }

  setGrid(grid) {
    this.grid = grid;
    if (this.scene) {
      this.bindToScene(this.scene);
    }
  }

  getViewBox() {
    if (!this.grid) return null;

    let {width, height} = this.grid.getProjectedRect();
    let initialSceneSize = Math.max(width, height) / 4;
    return {
      left:  -initialSceneSize,
      top:    initialSceneSize,
      right:  initialSceneSize,
      bottom: -initialSceneSize,
    };
  }

  moveTo(x, y = 0) {
    console.warn('Please use moveBy() instead. The moveTo() is under construction');
    // this.dx = x;
    // this.dy = y;

    // this._transferTransform();
  }

  moveBy(dx, dy = 0) {
    this.dx = dx;
    this.dy = dy;

    this._transferTransform();
  }

  rotate(angleInRadians) {
    this.angle = angleInRadians;
    this._transferTransform();
  }

  buildLinesCollection() {
    if (this.lines) return this.lines;

    let grid = this.grid;
    let lines = new WireCollection(grid.wayPointCount, {
      width: this._lineWidth,
      allowColors: false,
      is3D: false
    });
    grid.forEachWay(function(from, to) {
      lines.add({from, to});
    });
    let color = tinycolor(this._color).toRgb();
    lines.color = toRatioColor(color);
    lines.id = this.id;

    this.lines = lines;
  }

  buildMarker() {
    if (this.marker || !this.grid || !this.grid.targetLocation) return null;

    const {lat, lon} = this.grid.targetLocation;
    const project = this.grid.getProjector();
    const projected = project({lon, lat});

    // Create a point collection with 1 point for the marker
    let marker = new PointCollection(1, {
      size: 20,
      allowColors: true
    });

    marker.add({
      x: projected.x,
      y: projected.y,
      z: 0,
      color: {r: 1, g: 0, b: 0, a: 1} // Red color
    });

    marker.id = this.id + '_marker';
    this.marker = marker;
    return marker;
  }

  destroy() {
    if (!this.scene) return;

    if (this.lines) {
      this.scene.removeChild(this.lines);
    }
    if (this.marker) {
      this.scene.removeChild(this.marker);
    }
  }

  bindToScene(scene) {
    if (this.scene && this.lines) {
      console.error('You seem to be adding this layer twice...')
    }

    this.scene = scene;
    if (!this.grid) return;

    this.buildLinesCollection();
    this.buildMarker();

    if (this.hidden) return;
    this.scene.appendChild(this.lines);
    if (this.marker) {
      this.scene.appendChild(this.marker);
    }
  }

  hide() {
    if (this.hidden) return;
    this.hidden = true;
    if (!this.scene || !this.grid) return;

    this.scene.removeChild(this.lines);
    if (this.marker) {
      this.scene.removeChild(this.marker);
    }
  }

  show() {
    if (!this.hidden) return;
    this.hidden = false;
    if (!this.scene || !this.grid) {
      console.log('Layer will be shown when grid is available');
      return;
    }

    this.scene.appendChild(this.lines);
    if (this.marker) {
      this.scene.appendChild(this.marker);
    }
  }

  _transferTransform() {
    if (!this.lines) return;

    // Reset transform by setting identity
    this.lines.model = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
    
    // Apply rotation around Z axis if needed
    if (this.angle !== 0) {
      const cos = Math.cos(this.angle);
      const sin = Math.sin(this.angle);
      this.lines.model = [
        cos, sin, 0, 0,
        -sin, cos, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ];
    }
    
    // Apply translation
    if (this.dx !== 0 || this.dy !== 0) {
      this.lines.translate([this.dx, this.dy, 0]);
    }
    
    this.lines.updateWorldTransform(true);
    
    // Apply same transformations to marker if it exists
    if (this.marker) {
      this.marker.model = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ];
      
      if (this.angle !== 0) {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        this.marker.model = [
          cos, sin, 0, 0,
          -sin, cos, 0, 0,
          0, 0, 1, 0,
          0, 0, 0, 1
        ];
      }
      
      if (this.dx !== 0 || this.dy !== 0) {
        this.marker.translate([this.dx, this.dy, 0]);
      }
      
      this.marker.updateWorldTransform(true);
    }
    
    if (this.scene) {
      this.scene.renderFrame(true);
    }
  }
}

function toRatioColor(c) {
  return {r: c.r/0xff, g: c.g/0xff, b: c.b/0xff, a: c.a}
}