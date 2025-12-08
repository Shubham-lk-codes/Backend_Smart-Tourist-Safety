# backend/ml_model/anomaly_detector_simple.py (Updated with Repeating Alerts)
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
import pygame
import threading
import tempfile

warnings.filterwarnings('ignore')

class TouristAnomalyDetector:
    def __init__(self, node_api_url="http://localhost:3000/api", 
                 mongo_uri="mongodb+srv://shubhamlonkar137_db_user:e9km9tp6Q7rdjbju@cluster0.zv3zhoi.mongodb.net/?appName=Cluster0"):
        """
        Initialize anomaly detection system with MongoDB and Repeating Alerts
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
        
        # Movement tracking with repeating alert support
        self.tourist_states = {}  # Track each tourist's state
        
        # Voice alert system
        self.voice_alerts_enabled = True
        self.last_voice_alert = {}  # Track last voice alert time per tourist
        self.audio_playing = False  # Track if audio is currently playing
        
        # Initialize audio system
        self._init_audio_system()
        
        # Pre-recorded audio files path
        self.audio_files_dir = os.path.join(os.path.dirname(__file__), 'audio_files')
        self._create_audio_files_dir()
        
        # Hindi audio files mapping
        self.audio_files = {
            'unsafe_zone': 'unsafe_zone.wav',
            'restricted_zone': 'restricted_zone.wav', 
            'high_speed': 'high_speed.wav',
            'stationary': 'stationary.wav',
            'phone_off': 'phone_off.wav',
            'test_alert': 'test_alert.wav',
            'welcome': 'welcome.wav'
        }
        
        # Check if audio files exist
        self._check_audio_files()
        
        # Configuration - Updated with repeating alert settings
        self.config = {
            'stationary_threshold': 300,  # 5 minutes
            'suspicious_speed': 15.0,     # m/s
            'max_walking_speed': 5.0,     # m/s
            'phone_off_threshold': 300,   # 5 minutes
            'geofence_buffer': 50,        # meters
            'voice_alert_cooldown': 60,   # 1 minute cooldown between voice alerts
            'repeating_alert_interval': 5,  # 5 seconds between repeating alerts
            'voice_volume': 0.7,          # Volume level (0.0 to 1.0)
        }
        
        # Load or train model
        self._initialize_model()
        print(f"🤖 TouristAnomalyDetector initialized. Node API: {node_api_url}")
        print(f"🔊 Pre-recorded Voice Alerts: Enabled")
        print(f"⏱️ Repeating Alerts: Every {self.config['repeating_alert_interval']} seconds")
        print(f"💬 Language: Hindi")
        
        # Play welcome message
        self._play_welcome_message()
    
    def _create_audio_files_dir(self):
        """Create directory for audio files"""
        if not os.path.exists(self.audio_files_dir):
            os.makedirs(self.audio_files_dir)
            print(f"📁 Created audio files directory: {self.audio_files_dir}")
    
    def _check_audio_files(self):
        """Check if audio files exist"""
        print("🔍 Checking for audio files...")
        
        for alert_type, filename in self.audio_files.items():
            filepath = os.path.join(self.audio_files_dir, filename)
            
            if os.path.exists(filepath):
                print(f"✅ Found: {filename} ({os.path.getsize(filepath)} bytes)")
            else:
                # Check for .txt version
                txt_filepath = filepath + '.txt'
                if os.path.exists(txt_filepath):
                    # Rename .txt to .wav
                    os.rename(txt_filepath, filepath)
                    print(f"✅ Renamed: {filename}.txt → {filename}")
                else:
                    print(f"❌ Missing: {filename}")
                    print(f"   Please add this audio file to: {self.audio_files_dir}")
        
        print(f"📁 Audio files directory: {self.audio_files_dir}")
    
    def _init_audio_system(self):
        """Initialize audio system"""
        try:
            pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=4096)
            print("✅ Audio system initialized")
        except Exception as e:
            print(f"❌ Audio system initialization failed: {e}")
            self.voice_alerts_enabled = False
    
    def _play_audio_file(self, alert_type):
        """Play pre-recorded audio file in background thread"""
        try:
            if not self.voice_alerts_enabled:
                return False
            
            if self.audio_playing:
                print(f"🔊 Audio already playing, skipping: {alert_type}")
                return False
            
            if alert_type not in self.audio_files:
                print(f"❌ No audio file for alert type: {alert_type}")
                return False
            
            filename = self.audio_files[alert_type]
            filepath = os.path.join(self.audio_files_dir, filename)
            
            if not os.path.exists(filepath):
                print(f"❌ Audio file not found: {filepath}")
                return False
            
            # Play audio in background thread
            def play_audio():
                try:
                    self.audio_playing = True
                    
                    # Load and play audio
                    sound = pygame.mixer.Sound(filepath)
                    sound.set_volume(self.config['voice_volume'])
                    sound.play()
                    
                    # Wait for audio to finish
                    pygame.time.wait(int(sound.get_length() * 1000))
                    
                    self.audio_playing = False
                    return True
                except Exception as e:
                    print(f"❌ Audio playback error in thread: {e}")
                    self.audio_playing = False
                    return False
            
            # Start audio playback in separate thread
            audio_thread = threading.Thread(target=play_audio, daemon=True)
            audio_thread.start()
            
            # Hindi text messages for display
            hindi_messages = {
                'unsafe_zone': "चेतावनी! आप असुरक्षित क्षेत्र में प्रवेश कर गए हैं...",
                'restricted_zone': "सतर्क! यह प्रतिबंधित क्षेत्र है...",
                'high_speed': "खतरा! बहुत तेज गति का पता चला है...",
                'stationary': "सावधान! आप बहुत देर से एक ही जगह पर हैं...",
                'phone_off': "सूचना! आपका फोन सिग्नल नहीं मिल रहा है...",
                'test_alert': "यह एक टेस्ट अलर्ट है...",
                'welcome': "स्वागत है! आपकी सुरक्षा प्रणाली सक्रिय है..."
            }
            
            message = hindi_messages.get(alert_type, "सुरक्षा चेतावनी")
            print(f"🔊 Playing: {message}")
            
            return True
            
        except Exception as e:
            print(f"❌ Audio playback error: {e}")
            return False
    
    def _play_welcome_message(self):
        """Play welcome message when system starts"""
        if self.voice_alerts_enabled:
            time.sleep(2)  # Wait for system to initialize
            self._play_audio_file('welcome')
    
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
                'phone_status': activity_data.get('phone_status', 'online'),
                'current_zone': activity_data.get('current_zone', 'safe')
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
                            return geofence
            
            return None
        except Exception as e:
            print(f"Geofence check error: {e}")
            return None
    
    def process_location_update(self, tourist_id, lat, lng, timestamp=None, speed=None):
        """
        Process new location update for a tourist with repeating alerts
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
                'tourist_name': tourist_info.get('name', 'Unknown') if tourist_info else 'Unknown',
                'last_voice_alert_time': 0,
                'current_zone': 'safe',
                'entered_unsafe_zone_at': None,
                'last_repeating_alert_time': 0,
                'repeating_alert_active': False
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
        voice_alerts_sent = []
        
        # 1. Check stationary status
        if distance_moved < 5:  # Stationary (less than 5 meters)
            stationary_duration = timestamp - state['stationary_start']
            if stationary_duration > self.config['stationary_threshold']:
                if 'stationary' not in state['alerts_sent']:
                    state['alerts_sent'].append('stationary')
                    alert_msg = f"🚨 Stationary for {int(stationary_duration)}s"
                    alerts.append(alert_msg)
                    
                    # Play stationary audio alert with cooldown
                    current_time = time.time()
                    if (self.voice_alerts_enabled and 
                        current_time - state.get('last_voice_alert_time', 0) > self.config['voice_alert_cooldown']):
                        if self._play_audio_file('stationary'):
                            voice_alerts_sent.append("stationary_alert")
                            state['last_voice_alert_time'] = current_time
        else:
            state['stationary_start'] = timestamp
        
        # 2. Check phone off
        if time_diff > self.config['phone_off_threshold']:
            if 'phone_off' not in state['alerts_sent']:
                state['alerts_sent'].append('phone_off')
                state['phone_status'] = 'offline'
                alert_msg = f"📴 No signal for {int(time_diff)}s"
                alerts.append(alert_msg)
                
                # Play phone off audio alert with cooldown
                current_time = time.time()
                if (self.voice_alerts_enabled and 
                    current_time - state.get('last_voice_alert_time', 0) > self.config['voice_alert_cooldown']):
                    if self._play_audio_file('phone_off'):
                        voice_alerts_sent.append("phone_off_alert")
                        state['last_voice_alert_time'] = current_time
        else:
            state['phone_status'] = 'online'
        
        # 3. Check geofence violations using MongoDB (WITH REPEATING ALERTS)
        violating_geofence = self._check_geofence_violation(lat, lng)
        previous_zone = state['current_zone']
        
        if violating_geofence:
            zone_name = violating_geofence.get('name', 'Restricted Area')
            zone_type = violating_geofence.get('zone_type', 'restricted')
            
            # Update zone state
            state['current_zone'] = zone_type
            
            # Check if user just entered unsafe/restricted zone
            if zone_type in ['unsafe', 'restricted'] and previous_zone == 'safe':
                state['entered_unsafe_zone_at'] = timestamp
                state['last_repeating_alert_time'] = 0
                state['repeating_alert_active'] = True
                alert_msg = f"🚫 ENTERED {zone_type.upper()} ZONE: {zone_name}"
                alerts.append(alert_msg)
                
                # Play initial alert
                current_time = time.time()
                alert_type = 'unsafe_zone' if zone_type == 'unsafe' else 'restricted_zone'
                if self.voice_alerts_enabled:
                    if self._play_audio_file(alert_type):
                        voice_alerts_sent.append(f"{alert_type}_initial")
                        state['last_voice_alert_time'] = current_time
                        state['last_repeating_alert_time'] = current_time
            
            # User is already in unsafe zone - check for repeating alert
            elif zone_type in ['unsafe', 'restricted'] and previous_zone == zone_type:
                current_time = time.time()
                
                # Check if it's time for repeating alert (every 5 seconds)
                if current_time - state.get('last_repeating_alert_time', 0) >= self.config['repeating_alert_interval']:
                    alert_type = 'unsafe_zone' if zone_type == 'unsafe' else 'restricted_zone'
                    if self.voice_alerts_enabled:
                        if self._play_audio_file(alert_type):
                            voice_alerts_sent.append(f"{alert_type}_repeating")
                            state['last_repeating_alert_time'] = current_time
                            alerts.append(f"🔁 REPEATING ALERT: Still in {zone_type.upper()} zone")
            
            # Zone changed (e.g., from unsafe to restricted)
            elif zone_type in ['unsafe', 'restricted'] and previous_zone != zone_type:
                state['entered_unsafe_zone_at'] = timestamp
                state['last_repeating_alert_time'] = 0
                alert_msg = f"🔄 ZONE CHANGED TO {zone_type.upper()}: {zone_name}"
                alerts.append(alert_msg)
        
        else:
            # User is not in any restricted zone
            state['current_zone'] = 'safe'
            
            # Check if user just left unsafe zone
            if previous_zone in ['unsafe', 'restricted']:
                state['entered_unsafe_zone_at'] = None
                state['repeating_alert_active'] = False
                alert_msg = f"✅ RETURNED TO SAFE ZONE"
                alerts.append(alert_msg)
        
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
                    alert_msg = f"🚗 SUSPICIOUS SPEED: {mean_speed:.1f} m/s"
                    alerts.append(alert_msg)
                    
                    # Play high speed audio alert with cooldown
                    current_time = time.time()
                    if (self.voice_alerts_enabled and 
                        current_time - state.get('last_voice_alert_time', 0) > self.config['voice_alert_cooldown']):
                        if self._play_audio_file('high_speed'):
                            voice_alerts_sent.append("high_speed_alert")
                            state['last_voice_alert_time'] = current_time
                            
                elif mean_speed < 0.1 and len(state['movement_history']) > 10:
                    is_anomalous = True
                    anomaly_score = 0.6
                    alert_msg = "⚠️ ABNORMAL STATIONARY PATTERN"
                    alerts.append(alert_msg)
                    
            except Exception as e:
                print(f"ML detection error: {e}")
        
        # Calculate unsafe zone duration
        unsafe_zone_duration = 0
        if state['entered_unsafe_zone_at']:
            unsafe_zone_duration = timestamp - state['entered_unsafe_zone_at']
        
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
            'voice_alerts': voice_alerts_sent,
            'current_zone': state['current_zone'],
            'repeating_alert_active': state['repeating_alert_active'],
            'unsafe_zone_duration': unsafe_zone_duration,
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
            'voice_alerts': voice_alerts_sent,
            'location': {'lat': lat, 'lng': lng},
            'current_zone': state['current_zone'],
            'repeating_alert_active': state['repeating_alert_active'],
            'unsafe_zone_duration': unsafe_zone_duration,
            'timestamp': datetime.fromtimestamp(timestamp).isoformat(),
            'activity_saved': activity_saved,
            'history_size': len(state['movement_history']),
            'phone_status': state['phone_status'],
            'speed': speed if speed else 0,
            'database_connected': self.db is not None,
            'voice_alert_played': len(voice_alerts_sent) > 0,
            'needs_repeating_alert': (
                state['current_zone'] in ['unsafe', 'restricted'] and
                timestamp - state.get('last_repeating_alert_time', 0) >= self.config['repeating_alert_interval']
            )
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
    
    def get_tourist_state(self, tourist_id):
        """Get current state of a tourist"""
        if tourist_id in self.tourist_states:
            return self.tourist_states[tourist_id]
        return None
    
    def trigger_repeating_alert(self, tourist_id, alert_type='unsafe_zone'):
        """Manually trigger a repeating alert"""
        try:
            if not self.voice_alerts_enabled:
                return False
            
            if alert_type not in self.audio_files:
                print(f"❌ Invalid alert type: {alert_type}")
                return False
            
            # Play the alert
            success = self._play_audio_file(alert_type)
            
            # Update tourist state
            if tourist_id in self.tourist_states:
                self.tourist_states[tourist_id]['last_repeating_alert_time'] = time.time()
                self.tourist_states[tourist_id]['repeating_alert_active'] = True
            
            return success
            
        except Exception as e:
            print(f"Error triggering repeating alert: {e}")
            return False
    
    def stop_repeating_alert(self, tourist_id):
        """Stop repeating alerts for a tourist"""
        try:
            if tourist_id in self.tourist_states:
                self.tourist_states[tourist_id]['repeating_alert_active'] = False
                self.tourist_states[tourist_id]['current_zone'] = 'safe'
                self.tourist_states[tourist_id]['entered_unsafe_zone_at'] = None
                return True
            return False
        except Exception as e:
            print(f"Error stopping repeating alert: {e}")
            return False
    
    def send_test_voice_alert(self):
        """Send a test voice alert"""
        try:
            if self.voice_alerts_enabled:
                print("🔊 Playing test voice alert...")
                return self._play_audio_file('test_alert')
            else:
                print("❌ Voice alerts are disabled")
                return False
        except Exception as e:
            print(f"Test voice alert error: {e}")
            return False
    
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
    
    def toggle_voice_alerts(self, enabled=True):
        """Toggle voice alerts on/off"""
        self.voice_alerts_enabled = enabled
        status = "सक्षम" if enabled else "अक्षम"
        print(f"🔊 Hindi voice alerts {status}")
        return self.voice_alerts_enabled
    
    def get_system_status(self):
        """Get system status"""
        # Count tourists in unsafe zones
        unsafe_tourists = 0
        repeating_alerts_active = 0
        for tourist_id, state in self.tourist_states.items():
            if state.get('current_zone') in ['unsafe', 'restricted']:
                unsafe_tourists += 1
            if state.get('repeating_alert_active'):
                repeating_alerts_active += 1
        
        return {
            'is_trained': self.is_trained,
            'tourists_tracking': len(self.tourist_states),
            'unsafe_tourists': unsafe_tourists,
            'repeating_alerts_active': repeating_alerts_active,
            'config': self.config,
            'model_ready': self.model is not None,
            'database_connected': self.db is not None,
            'voice_alerts_enabled': self.voice_alerts_enabled,
            'live_users_count': len(self.get_all_live_users()),
            'hindi_voice_alerts': True,
            'audio_files_available': len([f for f in os.listdir(self.audio_files_dir) if f.endswith('.wav')]),
            'audio_system_working': pygame.mixer.get_init() is not None,
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
    print("🔊 Pre-recorded Voice alert system ready")
    print(f"⏱️ Repeating alert interval: {detector.config['repeating_alert_interval']} seconds")
except Exception as e:
    print(f"❌ Failed to initialize ML Detector: {e}")
    detector = None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy' if detector else 'unhealthy',
        'service': 'ML Anomaly Detection with Repeating Voice Alerts',
        'model_ready': detector.is_trained if detector else False,
        'database_connected': detector.db is not None if detector else False,
        'voice_alerts': detector.voice_alerts_enabled if detector else False,
        'repeating_alerts': True,
        'repeating_interval': detector.config['repeating_alert_interval'] if detector else 5,
        'hindi_voice': True,
        'audio_system': pygame.mixer.get_init() is not None if detector else False,
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
            'result': result,
            'voice_alert_played': result.get('voice_alert_played', False),
            'repeating_alert_active': result.get('repeating_alert_active', False),
            'needs_repeating_alert': result.get('needs_repeating_alert', False)
        })
    
    except Exception as e:
        print(f"Detection error: {e}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/check-zone', methods=['POST'])
def check_zone():
    """Check if location is in safe/unsafe zone"""
    try:
        data = request.get_json()
        lat = data.get('latitude')
        lng = data.get('longitude')
        tourist_id = data.get('tourist_id')
        
        if not lat or not lng:
            return jsonify({'error': 'Latitude and longitude required'}), 400
        
        # Check geofence violation
        violating_geofence = detector._check_geofence_violation(float(lat), float(lng))
        
        if violating_geofence:
            zone_type = violating_geofence.get('zone_type', 'restricted')
            zone_name = violating_geofence.get('name', 'Restricted Area')
            
            # Get tourist state
            tourist_state = detector.get_tourist_state(tourist_id)
            previous_zone = tourist_state.get('current_zone', 'safe') if tourist_state else 'safe'
            
            # Trigger voice alert if in unsafe/restricted zone
            if zone_type in ['unsafe', 'restricted']:
                alert_type = 'unsafe_zone' if zone_type == 'unsafe' else 'restricted_zone'
                
                # If just entered unsafe zone, trigger alert
                if previous_zone == 'safe' and detector.voice_alerts_enabled:
                    detector._play_audio_file(alert_type)
            
            return jsonify({
                'success': True,
                'zone_type': zone_type,
                'zone_name': zone_name,
                'is_safe': False,
                'previous_zone': previous_zone,
                'repeating_alert_needed': True,
                'message': f'You are in {zone_name} ({zone_type} zone)',
                'hindi_message': 'चेतावनी! आप असुरक्षित क्षेत्र में हैं।' if zone_type == 'unsafe' else 'सतर्क! यह प्रतिबंधित क्षेत्र है।',
                'recommendation': 'Please exit immediately for your safety.' if zone_type == 'unsafe' else 'Entry prohibited for security reasons.'
            })
        else:
            return jsonify({
                'success': True,
                'zone_type': 'safe',
                'zone_name': 'Safe Area',
                'is_safe': True,
                'message': 'You are in a safe zone',
                'hindi_message': 'आप सुरक्षित क्षेत्र में हैं।',
                'recommendation': 'Continue enjoying your journey safely.'
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/repeating-alert/status/<tourist_id>', methods=['GET'])
def get_repeating_alert_status(tourist_id):
    """Get repeating alert status for a tourist"""
    try:
        if not detector:
            return jsonify({'error': 'Detector not available'}), 503
        
        tourist_state = detector.get_tourist_state(tourist_id)
        current_time = time.time()
        
        if tourist_state:
            needs_alert = (
                tourist_state.get('current_zone') in ['unsafe', 'restricted'] and
                tourist_state.get('repeating_alert_active', False) and
                current_time - tourist_state.get('last_repeating_alert_time', 0) >= detector.config['repeating_alert_interval']
            )
            
            return jsonify({
                'success': True,
                'tourist_id': tourist_id,
                'current_zone': tourist_state.get('current_zone', 'safe'),
                'repeating_alert_active': tourist_state.get('repeating_alert_active', False),
                'entered_unsafe_zone_at': tourist_state.get('entered_unsafe_zone_at'),
                'last_repeating_alert_time': tourist_state.get('last_repeating_alert_time', 0),
                'needs_repeating_alert': needs_alert,
                'time_since_last_alert': current_time - tourist_state.get('last_repeating_alert_time', 0) if tourist_state.get('last_repeating_alert_time') else None,
                'alert_type': 'unsafe_zone' if tourist_state.get('current_zone') == 'unsafe' else 'restricted_zone' if tourist_state.get('current_zone') == 'restricted' else None
            })
        else:
            return jsonify({
                'success': True,
                'tourist_id': tourist_id,
                'current_zone': 'safe',
                'repeating_alert_active': False,
                'entered_unsafe_zone_at': None,
                'last_repeating_alert_time': 0,
                'needs_repeating_alert': False,
                'alert_type': None
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/repeating-alert/trigger', methods=['POST'])
def trigger_repeating_alert():
    """Trigger a repeating alert for a tourist"""
    try:
        if not detector:
            return jsonify({'error': 'ML detector not available'}), 503
        
        data = request.get_json()
        tourist_id = data.get('tourist_id')
        alert_type = data.get('alert_type', 'unsafe_zone')
        
        if not tourist_id:
            return jsonify({'error': 'Tourist ID required'}), 400
        
        # Check if alert type is valid
        if alert_type not in ['unsafe_zone', 'restricted_zone']:
            return jsonify({'error': 'Invalid alert type'}), 400
        
        # Trigger the repeating alert
        success = detector.trigger_repeating_alert(tourist_id, alert_type)
        
        return jsonify({
            'success': success,
            'message': 'Repeating alert triggered successfully',
            'alert_type': alert_type,
            'hindi_message': 'दोहराव चेतावनी ट्रिगर की गई'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/repeating-alert/stop', methods=['POST'])
def stop_repeating_alert():
    """Stop repeating alerts for a tourist"""
    try:
        if not detector:
            return jsonify({'error': 'ML detector not available'}), 503
        
        data = request.get_json()
        tourist_id = data.get('tourist_id')
        
        if not tourist_id:
            return jsonify({'error': 'Tourist ID required'}), 400
        
        # Stop the repeating alert
        success = detector.stop_repeating_alert(tourist_id)
        
        return jsonify({
            'success': success,
            'message': 'Repeating alert stopped successfully',
            'hindi_message': 'दोहराव चेतावनी बंद की गई'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/voice-alert/test', methods=['POST'])
def test_voice_alert():
    """Test voice alert system"""
    try:
        if not detector:
            return jsonify({'error': 'ML detector not available'}), 503
        
        success = detector.send_test_voice_alert()
        
        return jsonify({
            'success': success,
            'message': 'Voice alert played successfully' if success else 'Voice alert failed',
            'hindi_message': 'टेस्ट अलर्ट प्ले हो रहा है'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/voice-alert/toggle', methods=['POST'])
def toggle_voice_alerts():
    """Toggle voice alerts on/off"""
    try:
        if not detector:
            return jsonify({'error': 'ML detector not available'}), 503
        
        data = request.get_json()
        enabled = data.get('enabled', True)
        
        new_status = detector.toggle_voice_alerts(enabled)
        
        return jsonify({
            'success': True,
            'voice_alerts_enabled': new_status,
            'message': f'Voice alerts {"enabled" if new_status else "disabled"}',
            'hindi_message': f"आवाज़ चेतावनी {'सक्षम' if new_status else 'अक्षम'}"
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
    """Simulate anomaly for testing with voice alert"""
    try:
        data = request.get_json()
        tourist_id = data.get('tourist_id', 'test_tourist')
        
        # Create a simulated anomaly (high speed)
        result = {
            'tourist_id': tourist_id,
            'anomaly_score': 0.9,
            'is_anomalous': True,
            'alerts': ['🚨 SIMULATED ANOMALY: High speed detected (25 m/s)'],
            'voice_alerts': ['high_speed_alert'],
            'location': {'lat': 28.6139, 'lng': 77.2090},
            'timestamp': datetime.now().isoformat(),
            'phone_status': 'online',
            'speed': 25.0,
            'activity_saved': False,
            'database_connected': detector.db is not None if detector else False,
            'hindi_alert': True
        }
        
        # Send alert to backend
        if detector:
            detector._send_alerts_to_node(
                tourist_id, 
                ['🚨 SIMULATED ANOMALY: High speed detected (25 m/s)'],
                28.6139, 77.2090
            )
            
            # Send test voice alert
            detector.send_test_voice_alert()
        
        return jsonify({
            'success': True,
            'message': 'Anomaly simulated with voice alert',
            'hindi_message': 'असामान्य गतिविधि सिम्युलेट की गई',
            'result': result
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/monitor-repeating-alerts', methods=['GET'])
def monitor_repeating_alerts():
    """Monitor all repeating alerts in the system"""
    try:
        if not detector:
            return jsonify({'error': 'Detector not available'}), 503
        
        current_time = time.time()
        alerts_info = []
        
        for tourist_id, state in detector.tourist_states.items():
            if state.get('current_zone') in ['unsafe', 'restricted']:
                time_in_zone = 0
                if state.get('entered_unsafe_zone_at'):
                    time_in_zone = current_time - state.get('entered_unsafe_zone_at')
                
                time_since_last_alert = 0
                if state.get('last_repeating_alert_time'):
                    time_since_last_alert = current_time - state.get('last_repeating_alert_time')
                
                needs_alert = time_since_last_alert >= detector.config['repeating_alert_interval']
                
                alerts_info.append({
                    'tourist_id': tourist_id,
                    'tourist_name': state.get('tourist_name', 'Unknown'),
                    'current_zone': state.get('current_zone'),
                    'time_in_zone': round(time_in_zone, 1),
                    'time_since_last_alert': round(time_since_last_alert, 1),
                    'needs_alert': needs_alert,
                    'repeating_alert_active': state.get('repeating_alert_active', False),
                    'location': state.get('last_location', (0, 0))
                })
        
        return jsonify({
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'total_tourists': len(detector.tourist_states),
            'unsafe_tourists': len(alerts_info),
            'repeating_alerts': alerts_info,
            'repeating_interval': detector.config['repeating_alert_interval']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5001))
    print(f"\n{'='*60}")
    print(f"🚀 ML Anomaly Detection API with REPEATING VOICE ALERTS")
    print(f"📡 Port: {port}")
    print(f"🔊 Voice Alerts: Pre-recorded Audio Files")
    print(f"⏱️ Repeating Alerts: Every 5 seconds in unsafe zones")
    print(f"💬 Language: Hindi")
    print(f"📁 Audio Files Dir: {detector.audio_files_dir if detector else 'N/A'}")
    print(f"🌐 Frontend URL: http://localhost:5173")
    print(f"🔗 Backend API: http://localhost:3000/api")
    print(f"\n📝 IMPORTANT: Audio files should be in .wav format")
    print(f"📝 Repeating alerts automatically trigger every 5 seconds")
    print(f"{'='*60}\n")
    
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)