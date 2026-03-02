const identityService = require('../services/identityService');

const identify = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: 'Email or phoneNumber is required' });
    }

    const result = await identityService.reconcileIdentity(
      email ? String(email) : null, 
      phoneNumber ? String(phoneNumber) : null
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Identification Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { identify };