const { getEmergencyAlertsMap } = require('./websocketController');

const getEmergencies = (req, res) => {
  const emergencies = Array.from(getEmergencyAlertsMap().values());
  res.json({
    activeEmergencies: emergencies.filter(e => e.status === 'active').length,
    totalEmergencies: emergencies.length,
    emergencies: emergencies
  });
};

const getEmergencyById = (req, res) => {
  const alert = getEmergencyAlertsMap().get(req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Emergency alert not found' });
  }
  res.json(alert);
};

module.exports = {
  getEmergencies,
  getEmergencyById
};