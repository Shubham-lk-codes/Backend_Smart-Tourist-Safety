# backend/ml_model/create_audio_files.py
from gtts import gTTS
import os

# Create audio files directory
audio_dir = os.path.join(os.path.dirname(__file__), 'audio_files')
os.makedirs(audio_dir, exist_ok=True)

# Hindi messages for audio files
hindi_messages = {
    'unsafe_zone': "चेतावनी! आप असुरक्षित क्षेत्र में प्रवेश कर गए हैं। कृपया अपनी सुरक्षा के लिए तुरंत बाहर निकलें।",
    'restricted_zone': "सतर्क! यह प्रतिबंधित क्षेत्र है। सुरक्षा कारणों से प्रवेश वर्जित है।",
    'high_speed': "खतरा! बहुत तेज गति का पता चला है। कृपया अपनी सुरक्षा के लिए गति कम करें।",
    'stationary': "सावधान! आप बहुत देर से एक ही जगह पर हैं। क्या सब ठीक है?",
    'phone_off': "सूचना! आपका फोन सिग्नल नहीं मिल रहा है। कृपया अपनी स्थिति की जानकारी दें।",
    'test_alert': "यह एक टेस्ट अलर्ट है। आपकी सुरक्षा प्रणाली ठीक से काम कर रही है।",
    'welcome': "स्वागत है! आपकी सुरक्षा प्रणाली सक्रिय है। सुरक्षित रहें।"
}

print("🔊 Creating Hindi audio files...")

for alert_type, message in hindi_messages.items():
    filename = f"{alert_type}.mp3"
    filepath = os.path.join(audio_dir, filename)
    
    try:
        tts = gTTS(text=message, lang='hi', slow=False)
        tts.save(filepath)
        print(f"✅ Created: {filename}")
    except Exception as e:
        print(f"❌ Error creating {filename}: {e}")

print(f"\n📁 Audio files saved in: {audio_dir}")
print("🎵 You can now use these pre-recorded audio files in your application!")