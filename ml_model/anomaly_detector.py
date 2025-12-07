# backend/ml_model/anomaly_detector.py
import pandas as pd
import numpy as np
import joblib
import pickle
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import requests
import json
import time
from collections import deque
import warnings
import os
import sys
from pymongo import MongoClient
from bson import ObjectId

warnings.filterwarnings('ignore')

class TouristAnomalyDetector:
    def __init__(self, node_api_url="http://localhost:3000/api", 
                 mongo_uri="mongodb+srv://shubhamlonkar137_db_user:e9km9tp6Q7rdjbju@cluster0.zv3zhoi.mongodb.net/?appName=Cluster0"):
        """
        Initialize anomaly detection system with MongoDB
        """
        self.node_api_url = node_api_url
        self.mongo_uri = mongo_uri
        self.scaler = StandardScaler()
        self.model = None
        self.is_trained = False
        
        # MongoDB connection
        self.mongo_client = None
        self.db = None
        self._connect_to_mongodb()
        
        # Movement tracking
        self.tourist_states = {}  # Track each tourist's state
        
        # Configuration
        self.config = {
            'stationary_threshold': 300,  # 5 minutes
            'suspicious_speed': 15.0,     # m/s
            'max_walking_speed': 5.0,     # m/s
            'phone_off_threshold': 300,   # 5 minutes
            'geofence_buffer': 50         # meters
        }
        
        # Load or train model
        self._initialize_model()
        print(f"🤖 TouristAnomalyDetector initialized. Node API: {node_api_url}")
    
    def _connect_to_mongodb(self):
        """Connect to MongoDB database"""
        try:
            self.mongo_client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=5000)
            self.db = self.mongo_client.tourist_safety
            
            # Test connection
            self.mongo_client.server_info()
            print("✅ Connected to MongoDB successfully")
            
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            self.mongo_client = None
            self.db = None
    
    def _get_tourist_info(self, tourist_id):
        """Fetch tourist information from users collection"""
        try:
            if not self.db:
                return None
            
            # Try to get tourist by ObjectId first
            try:
                tourist = self.db.users.find_one({"_id": ObjectId(tourist_id)})
            except:
                # If not ObjectId, try by tourist_id field
                tourist = self.db.users.find_one({"tourist_id": tourist_id})
            
            return tourist
        except Exception as e:
            print(f"Error fetching tourist info: {e}")
            return None
    
    def _get_geofenced_areas(self):
        """Fetch all geofenced areas from database"""
        try:
            if not self.db:
                return []
            
            geofences = list(self.db.geofences.find({"is_active": True}))
            print(f"📌 Loaded {len(geofences)} active geofences from database")
            return geofences
        except Exception as e:
            print(f"Error fetching geofences: {e}")
            return []
    
    def _save_activity(self, activity_data):
        """Save tourist activity to activities collection"""
        try:
            if not self.db:
                print("❌ MongoDB not connected, cannot save activity")
                return False
            
            # Add timestamp if not present
            if 'timestamp' not in activity_data:
                activity_data['timestamp'] = datetime.now()
            
            # Save to activities collection
            result = self.db.activities.insert_one(activity_data)
            
            # Also update live user location
            self._update_live_user(activity_data)
            
            return result.inserted_id is not None
        except Exception as e:
            print(f"Error saving activity: {e}")
            return False
    
    def _update_live_user(self, activity_data):
        """Update or create live user tracking"""
        try:
            if not self.db:
                return False
            
            tourist_id = activity_data.get('tourist_id')
            if not tourist_id:
                return False
            
            # Get tourist name from users collection
            tourist_info = self._get_tourist_info(tourist_id)
            tourist_name = tourist_info.get('name', 'Unknown') if tourist_info else 'Unknown'
            
            # Prepare live user data
            live_user_data = {
                'tourist_id': tourist_id,
                'tourist_name': tourist_name,
                'location': activity_data.get('location'),
                'last_update': activity_data.get('timestamp', datetime.now()),
                'status': 'active',
                'speed': activity_data.get('speed', 0),
                'anomaly_score': activity_data.get('anomaly_score', 0),
                'is_anomalous': activity_data.get('is_anomalous', False),
                'phone_status': activity_data.get('phone_status', 'online')
            }
            
            # Update or insert
            self.db.liveusers.update_one(
                {'tourist_id': tourist_id},
                {'$set': live_user_data},
                upsert=True
            )
            
            return True
        except Exception as e:
            print(f"Error updating live user: {e}")
            return False
    
    def _initialize_model(self):
        """Initialize or load the ML model"""
        model_path = os.path.join(os.path.dirname(__file__), 'anomaly_model.pkl')
        
        try:
            if os.path.exists(model_path):
                with open(model_path, 'rb') as f:
                    saved_data = pickle.load(f)
                    self.model = saved_data['model']
                    self.scaler = saved_data['scaler']
                    self.is_trained = True
                print("✅ Loaded pre-trained anomaly detection model")
            else:
                print("📊 No pre-trained model found, training new model...")
                self._train_model()
        except Exception as e:
            print(f"❌ Error loading/training model: {e}")
            self._train_model()
    
    def _train_model(self):
        """Train the anomaly detection model"""
        print("🚀 Training anomaly detection model...")
        
        try:
            # Generate synthetic training data
            data = self._generate_training_data()
            
            # Extract features
            features = self._extract_features(data)
            
            # Scale features
            X_scaled = self.scaler.fit_transform(features)
            
            # Train Isolation Forest
            self.model = IsolationForest(
                contamination=0.15,
                random_state=42,
                n_estimators=150,
                max_samples='auto'
            )
            self.model.fit(X_scaled)
            self.is_trained = True
            
            # Save the model
            model_path = os.path.join(os.path.dirname(__file__), 'anomaly_model.pkl')
            with open(model_path, 'wb') as f:
                pickle.dump({
                    'model': self.model,
                    'scaler': self.scaler,
                    'is_trained': self.is_trained,
                    'config': self.config
                }, f)
            
            print("✅ Model trained and saved successfully")
        except Exception as e:
            print(f"❌ Error training model: {e}")
            self.is_trained = False
    
    def _generate_training_data(self, n_samples=1000):
        """Generate synthetic training data"""
        print("📊 Generating training data...")
        
        data = []
        
        # Normal patterns (80%)
        for _ in range(int(n_samples * 0.8)):
            speed = np.random.uniform(0.1, self.config['max_walking_speed'])
            speed_std = np.random.uniform(0.05, 0.5)
            acceleration = np.random.uniform(-0.5, 0.5)
            direction_change = np.random.uniform(0, 45)
            is_stationary = np.random.choice([0, 1], p=[0.85, 0.15])
            distance_variance = np.random.uniform(0.1, 1.0)
            
            data.append([
                speed, speed_std, acceleration, direction_change, 
                is_stationary, distance_variance
            ])
        
        # Anomalous patterns (20%)
        for _ in range(int(n_samples * 0.2)):
            # Fast movement
            if np.random.random() < 0.5:
                speed = np.random.uniform(self.config['suspicious_speed'], 30)
                speed_std = np.random.uniform(1, 5)
                acceleration = np.random.uniform(-3, 3)
                direction_change = np.random.uniform(0, 30)
                is_stationary = 0
                distance_variance = np.random.uniform(2, 5)
            
            # Erratic movement
            else:
                speed = np.random.uniform(0.5, self.config['max_walking_speed'])
                speed_std = np.random.uniform(1, 3)
                acceleration = np.random.uniform(-2, 2)
                direction_change = np.random.uniform(60, 180)
                is_stationary = 0
                distance_variance = np.random.uniform(1, 3)
            
            data.append([
                speed, speed_std, acceleration, direction_change, 
                is_stationary, distance_variance
            ])
        
        return pd.DataFrame(data, columns=[
            'speed', 'speed_std', 'acceleration', 'direction_change',
            'is_stationary', 'distance_variance'
        ])
    
    def haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance in meters"""
        R = 6371000  # Earth's radius in meters
        phi1 = np.radians(lat1)
        phi2 = np.radians(lat2)
        delta_phi = np.radians(lat2 - lat1)
        delta_lambda = np.radians(lon2 - lon1)
        
        a = np.sin(delta_phi/2)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(delta_lambda/2)**2
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
        return R * c
    
    def _check_geofence_violation(self, lat, lng):
        """Check if location is in any restricted geofence"""
        try:
            if not self.db:
                return None
            
            geofences = self._get_geofenced_areas()
            
            for geofence in geofences:
                # Check geofence type
                geofence_type = geofence.get('type', 'polygon')
                boundary = geofence.get('boundary', {})
                
                if geofence_type == 'circle':
                    # Circle geofence
                    center_lat = boundary.get('center', {}).get('lat')
                    center_lng = boundary.get('center', {}).get('lng')
                    radius = boundary.get('radius', 0)
                    
                    if center_lat and center_lng:
                        distance = self.haversine_distance(lat, lng, center_lat, center_lng)
                        if distance <= radius + self.config['geofence_buffer']:
                            return geofence
                
                elif geofence_type == 'polygon':
                    # Polygon geofence
                    coordinates = boundary.get('coordinates', [])
                    if coordinates:
                        # Simple bounding box check first
                        lats = [coord[0] for coord in coordinates]
                        lngs = [coord[1] for coord in coordinates]
                        
                        if (min(lats) <= lat <= max(lats) and 
                            min(lngs) <= lng <= max(lngs)):
                            # TODO: Implement proper point-in-polygon algorithm
                            # For now, return geofence if within bounding box
                            return geofence
            
            return None
        except Exception as e:
            print(f"Geofence check error: {e}")
            return None
    
    def process_location_update(self, tourist_id, lat, lng, timestamp=None, speed=None):
        """
        Process new location update for a tourist
        Returns: anomaly analysis
        """
        if timestamp is None:
            timestamp = time.time()
        
        # Get tourist info from database
        tourist_info = self._get_tourist_info(tourist_id)
        
        # Initialize tourist state if not exists
        if tourist_id not in self.tourist_states:
            self.tourist_states[tourist_id] = {
                'last_location': (lat, lng),
                'last_update': timestamp,
                'stationary_start': timestamp,
                'alerts_sent': [],
                'phone_status': 'online',
                'movement_history': [],
                'tourist_name': tourist_info.get('name', 'Unknown') if tourist_info else 'Unknown'
            }
        
        state = self.tourist_states[tourist_id]
        
        # Add to movement history
        state['movement_history'].append({
            'lat': lat,
            'lng': lng,
            'timestamp': timestamp,
            'speed': speed
        })
        
        # Keep only last 20 points
        if len(state['movement_history']) > 20:
            state['movement_history'] = state['movement_history'][-20:]
        
        # Update state
        old_lat, old_lng = state['last_location']
        state['last_location'] = (lat, lng)
        
        # Calculate distance moved
        distance_moved = self.haversine_distance(old_lat, old_lng, lat, lng)
        time_diff = timestamp - state['last_update']
        
        # Calculate speed if not provided
        if speed is None and time_diff > 0:
            speed = distance_moved / time_diff
        
        state['last_update'] = timestamp
        
        # Check for anomalies
        alerts = []
        anomaly_score = 0
        is_anomalous = False
        
        # 1. Check stationary status
        if distance_moved < 5:  # Stationary (less than 5 meters)
            stationary_duration = timestamp - state['stationary_start']
            if stationary_duration > self.config['stationary_threshold']:
                if 'stationary' not in state['alerts_sent']:
                    state['alerts_sent'].append('stationary')
                    alerts.append(f"🚨 Stationary for {int(stationary_duration)}s")
        else:
            state['stationary_start'] = timestamp
        
        # 2. Check phone off
        if time_diff > self.config['phone_off_threshold']:
            if 'phone_off' not in state['alerts_sent']:
                state['alerts_sent'].append('phone_off')
                state['phone_status'] = 'offline'
                alerts.append(f"📴 No signal for {int(time_diff)}s")
        else:
            state['phone_status'] = 'online'
        
        # 3. Check geofence violations using MongoDB
        violating_geofence = self._check_geofence_violation(lat, lng)
        if violating_geofence:
            zone_name = violating_geofence.get('name', 'Restricted Area')
            alerts.append(f"🚫 ENTERED RESTRICTED ZONE: {zone_name}")
        
        # 4. ML anomaly detection
        if len(state['movement_history']) >= 5 and self.is_trained:
            try:
                # Extract features
                speeds = [point.get('speed', 0) for point in state['movement_history'][-5:]]
                mean_speed = np.mean(speeds) if speeds else 0
                
                # Simple anomaly detection
                if mean_speed > self.config['suspicious_speed']:
                    is_anomalous = True
                    anomaly_score = 0.8
                    alerts.append(f"🚗 SUSPICIOUS SPEED: {mean_speed:.1f} m/s")
                elif mean_speed < 0.1 and len(state['movement_history']) > 10:
                    is_anomalous = True
                    anomaly_score = 0.6
                    alerts.append("⚠️ ABNORMAL STATIONARY PATTERN")
                    
            except Exception as e:
                print(f"ML detection error: {e}")
        
        # Prepare activity data for database
        activity_data = {
            'tourist_id': tourist_id,
            'tourist_name': state.get('tourist_name', 'Unknown'),
            'activity_type': 'location_update',
            'location': {
                'type': 'Point',
                'coordinates': [lng, lat]  # MongoDB GeoJSON format
            },
            'latitude': lat,
            'longitude': lng,
            'speed': speed if speed else 0,
            'anomaly_score': float(anomaly_score),
            'is_anomalous': is_anomalous,
            'alerts': alerts,
            'timestamp': datetime.fromtimestamp(timestamp),
            'processed_at': datetime.now(),
            'phone_status': state['phone_status'],
            'movement_history_size': len(state['movement_history'])
        }
        
        # Save activity to MongoDB
        activity_saved = self._save_activity(activity_data)
        
        # Send alerts if any
        if alerts:
            self._send_alerts_to_node(tourist_id, alerts, lat, lng)
        
        return {
            'tourist_id': tourist_id,
            'tourist_name': state.get('tourist_name', 'Unknown'),
            'anomaly_score': float(anomaly_score),
            'is_anomalous': is_anomalous,
            'alerts': alerts,
            'location': {'lat': lat, 'lng': lng},
            'timestamp': datetime.fromtimestamp(timestamp).isoformat(),
            'activity_saved': activity_saved,
            'history_size': len(state['movement_history']),
            'phone_status': state['phone_status'],
            'speed': speed if speed else 0,
            'database_connected': self.db is not None
        }
    
    def _send_alerts_to_node(self, tourist_id, alerts, lat, lng):
        """Send alerts to Node.js backend"""
        for alert in alerts:
            try:
                alert_data = {
                    'tourist_id': tourist_id,
                    'message': alert,
                    'location': {'latitude': lat, 'longitude': lng},
                    'timestamp': datetime.now().isoformat(),
                    'severity': 'HIGH' if '🚨' in alert else 'MEDIUM',
                    'type': 'ANOMALY_DETECTED'
                }
                
                response = requests.post(
                    f"{self.node_api_url}/emergencies/ml-alert",
                    json=alert_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=5
                )
                
                if response.status_code in [200, 201]:
                    print(f"✅ Alert sent to backend: {alert}")
                else:
                    print(f"❌ Alert failed: {response.status_code}")
            
            except Exception as e:
                print(f"Alert sending error: {e}")
    
    def get_all_live_users(self):
        """Get all live users from database"""
        try:
            if not self.db:
                return []
            
            live_users = list(self.db.liveusers.find(
                {},
                {'_id': 0}  # Exclude MongoDB _id
            ))
            return live_users
        except Exception as e:
            print(f"Error fetching live users: {e}")
            return []
    
    def get_tourist_activities(self, tourist_id, limit=50):
        """Get recent activities for a tourist"""
        try:
            if not self.db:
                return []
            
            activities = list(self.db.activities.find(
                {'tourist_id': tourist_id}
            ).sort('timestamp', -1).limit(limit))
            
            # Convert ObjectId to string
            for activity in activities:
                activity['_id'] = str(activity['_id'])
                if 'timestamp' in activity and isinstance(activity['timestamp'], datetime):
                    activity['timestamp'] = activity['timestamp'].isoformat()
            
            return activities
        except Exception as e:
            print(f"Error fetching activities: {e}")
            return []
    
    def get_system_status(self):
        """Get system status"""
        return {
            'is_trained': self.is_trained,
            'tourists_tracking': len(self.tourist_states),
            'config': self.config,
            'model_ready': self.model is not None,
            'database_connected': self.db is not None,
            'live_users_count': len(self.get_all_live_users()),
            'timestamp': datetime.now().isoformat()
        }

# Flask API for ML integration
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
    }
})

# Initialize detector
try:
    detector = TouristAnomalyDetector()
    print("✅ ML Detector initialized successfully with MongoDB")
except Exception as e:
    print(f"❌ Failed to initialize ML Detector: {e}")
    detector = None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy' if detector else 'unhealthy',
        'service': 'ML Anomaly Detection',
        'model_ready': detector.is_trained if detector else False,
        'database_connected': detector.db is not None if detector else False,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/status', methods=['GET'])
def status():
    """Get ML system status"""
    if detector:
        return jsonify(detector.get_system_status())
    else:
        return jsonify({
            'error': 'ML detector not initialized',
            'status': 'unavailable'
        }), 503

@app.route('/detect', methods=['POST'])
def detect():
    """Detect anomalies for tourist location"""
    try:
        if not detector:
            return jsonify({
                'error': 'ML detector not available',
                'success': False
            }), 503
        
        data = request.get_json()
        
        # Check required fields
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        tourist_id = data.get('tourist_id', f'tourist_{int(time.time())}')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if latitude is None or longitude is None:
            return jsonify({
                'error': 'Latitude and longitude are required'
            }), 400
        
        # Process location
        result = detector.process_location_update(
            tourist_id,
            float(latitude),
            float(longitude),
            data.get('timestamp', time.time()),
            data.get('speed')
        )
        
        return jsonify({
            'success': True,
            'result': result
        })
    
    except Exception as e:
        print(f"Detection error: {e}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/live-users', methods=['GET'])
def get_live_users():
    """Get all live users from database"""
    try:
        if not detector:
            return jsonify({'error': 'Detector not available'}), 503
        
        live_users = detector.get_all_live_users()
        return jsonify({
            'success': True,
            'count': len(live_users),
            'live_users': live_users
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/activities/<tourist_id>', methods=['GET'])
def get_activities(tourist_id):
    """Get activities for a specific tourist"""
    try:
        if not detector:
            return jsonify({'error': 'Detector not available'}), 503
        
        limit = request.args.get('limit', 50, type=int)
        activities = detector.get_tourist_activities(tourist_id, limit)
        
        return jsonify({
            'success': True,
            'tourist_id': tourist_id,
            'count': len(activities),
            'activities': activities
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/simulate', methods=['POST'])
def simulate():
    """Simulate anomaly for testing"""
    try:
        data = request.get_json()
        tourist_id = data.get('tourist_id', 'test_tourist')
        
        # Create a simulated anomaly (high speed)
        result = {
            'tourist_id': tourist_id,
            'anomaly_score': 0.9,
            'is_anomalous': True,
            'alerts': ['🚨 SIMULATED ANOMALY: High speed detected (25 m/s)'],
            'location': {'lat': 28.6139, 'lng': 77.2090},
            'timestamp': datetime.now().isoformat(),
            'phone_status': 'online',
            'speed': 25.0,
            'activity_saved': False,
            'database_connected': detector.db is not None if detector else False
        }
        
        # Send alert to backend
        if detector:
            detector._send_alerts_to_node(
                tourist_id, 
                ['🚨 SIMULATED ANOMALY: High speed detected (25 m/s)'],
                28.6139, 77.2090
            )
        
        return jsonify({
            'success': True,
            'message': 'Anomaly simulated',
            'result': result
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5001))
    print(f"\n{'='*50}")
    print(f"🚀 ML Anomaly Detection API")
    print(f"📡 Port: {port}")
    print(f"🌐 Frontend URL: http://localhost:5173")
    print(f"🔗 Backend API: http://localhost:3000/api")
    print(f"🗄️  MongoDB: mongodb://localhost:27017/tourist_safety")
    print(f"{'='*50}\n")
    
    app.run(host='0.0.0.0', port=port, debug=False)