const EmergencyContact = require('../models/EmergencyContact');

// Get all emergency contacts
const getEmergencyContacts = async (req, res) => {
  try {
    console.log('📋 Fetching emergency contacts...');
    const contacts = await EmergencyContact.find({ isActive: true })
      .sort({ priority: 1, name: 1 });
    
    console.log(`✅ Found ${contacts.length} emergency contacts`);
    res.json(contacts);
  } catch (error) {
    console.error('❌ Error fetching emergency contacts:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Get emergency contacts by type
const getEmergencyContactsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const contacts = await EmergencyContact.find({ 
      type: type,
      isActive: true 
    }).sort({ priority: 1 });
    
    res.json(contacts);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Initialize sample emergency contacts
const initializeSampleEmergencyContacts = async () => {
  try {
    const count = await EmergencyContact.countDocuments();
    
    if (count === 0) {
      console.log('📝 Creating sample emergency contacts...');
      
      const sampleContacts = [
        {
          name: "Police Emergency",
          phone: "100",
          type: "police",
          countryCode: "+91",
          description: "Police emergency hotline",
          priority: 1
        },
        {
          name: "Ambulance Emergency",
          phone: "102",
          type: "ambulance",
          countryCode: "+91",
          description: "Medical emergency ambulance",
          priority: 1
        },
        {
          name: "Fire Department",
          phone: "101",
          type: "fire",
          countryCode: "+91",
          description: "Fire emergency services",
          priority: 1
        },
        {
          name: "Tourist Helpline",
          phone: "1363",
          type: "tourist_helpline",
          countryCode: "+91",
          description: "24/7 tourist assistance",
          priority: 2
        },
        {
          name: "Women's Helpline",
          phone: "1091",
          type: "local_authority",
          countryCode: "+91",
          description: "Women's safety and assistance",
          priority: 2
        },
        {
          name: "Local Police Control Room",
          phone: "011-2301-3456",
          type: "police",
          countryCode: "+91",
          description: "Local police control room",
          priority: 2
        },
        {
          name: "Emergency Rescue",
          phone: "108",
          type: "ambulance",
          countryCode: "+91",
          description: "Disaster management helpline",
          priority: 3
        },
        {
          name: "US Embassy Helpline",
          phone: "011-2419-8000",
          type: "embassy",
          countryCode: "+91",
          description: "Emergency assistance for US citizens",
          priority: 3
        }
      ];

      await EmergencyContact.insertMany(sampleContacts);
      console.log('✅ Sample emergency contacts created');
    } else {
      console.log(`✅ ${count} emergency contacts already exist`);
    }
  } catch (error) {
    console.error('❌ Error creating sample emergency contacts:', error);
  }
};

module.exports = {
  getEmergencyContacts,
  getEmergencyContactsByType,
  initializeSampleEmergencyContacts
};