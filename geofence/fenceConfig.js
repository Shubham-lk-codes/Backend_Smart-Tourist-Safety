const Geofence = require('../models/Geofence');
const NodeCache = require('node-cache');

class FenceConfig {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 600 }); // 5 minutes TTL
  }

  // Get all active geofences from database
  async getActiveGeofences() {
    const cacheKey = 'active_geofences';
    let geofences = this.cache.get(cacheKey);
    
    if (!geofences) {
      geofences = await Geofence.find({ isActive: true });
      this.cache.set(cacheKey, geofences);
    }
    
    return geofences;
  }

  // Clear cache when geofences are updated
  clearCache() {
    this.cache.del('active_geofences');
  }

  // Check if point is in any geofence
  async isPointInGeofence(lat, lng) {
    try {
      const geofences = await this.getActiveGeofences();
      
      for (const geofence of geofences) {
        let isInside = false;
        
        if (geofence.type === 'circle') {
          isInside = this.isPointInCircle(lat, lng, geofence.center.lat, geofence.center.lng, geofence.radius);
        } else if (geofence.type === 'polygon') {
          isInside = this.isPointInPolygon(lat, lng, geofence.coordinates);
        }
        
        if (isInside) {
          return { inGeofence: true, boundary: geofence.name, geofence };
        }
      }
      
      return { inGeofence: false, boundary: null };
    } catch (error) {
      console.error('Error checking geofence:', error);
      throw error;
    }
  }

  // Circle geofence check
  isPointInCircle(lat1, lon1, lat2, lon2, radius) {
    const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
    return distance <= radius;
  }

  // Polygon geofence check using Ray Casting algorithm
  isPointInPolygon(lat, lng, polygon) {
    if (!polygon || polygon.length < 3) return false;
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      
      const intersect = ((yi > lng) !== (yj > lng)) &&
        (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  // Haversine formula for distance calculation
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // Find nearest geofences
  async findNearestGeofences(lat, lng, limit = 5) {
    const geofences = await this.getActiveGeofences();
    
    const withDistances = geofences.map(geofence => {
      let distance;
      if (geofence.type === 'circle') {
        distance = this.calculateDistance(lat, lng, geofence.center.lat, geofence.center.lng);
      } else {
        // For polygon, calculate distance to centroid
        const centroid = this.calculatePolygonCentroid(geofence.coordinates);
        distance = this.calculateDistance(lat, lng, centroid.lat, centroid.lng);
      }
      
      return { ...geofence.toObject(), distance };
    });
    
    return withDistances
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  // Calculate centroid of polygon
  calculatePolygonCentroid(coordinates) {
    let x = 0, y = 0;
    for (const coord of coordinates) {
      x += coord.lng;
      y += coord.lat;
    }
    return {
      lat: y / coordinates.length,
      lng: x / coordinates.length
    };
  }
}

module.exports = new FenceConfig();