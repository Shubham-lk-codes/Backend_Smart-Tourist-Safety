// geofence/fenceConfig.js
const fenceConfig = {
  // Define your geofence boundaries here
  boundaries: [
    {
      name: "Safe Zone 1",
      coordinates: {
        north: 28.6139,  // Example coordinates (Delhi)
        south: 28.6138,
        east: 77.2090,
        west: 77.2089
      },
      radius: 1000, // meters
      center: {
        lat: 28.6139,
        lng: 77.2090
      }
    }
  ],
  
  // Check if a point is within any geofence
  isPointInGeofence: function(lat, lng) {
    for (const boundary of this.boundaries) {
      if (this.isPointInRadius(lat, lng, boundary.center.lat, boundary.center.lng, boundary.radius)) {
        return { inGeofence: true, boundary: boundary.name };
      }
    }
    return { inGeofence: false, boundary: null };
  },
  
  // Calculate distance between two points using Haversine formula
  calculateDistance: function(lat1, lon1, lat2, lon2) {
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
  },
  
  // Check if point is within radius
  isPointInRadius: function(lat1, lon1, lat2, lon2, radius) {
    const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
    return distance <= radius;
  }
};

module.exports = fenceConfig;