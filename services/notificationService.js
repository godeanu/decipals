// notificationService.js 
const apn = require('apn');
const pool = require('../db');
require('dotenv').config();

const options = {
  token: {
    key: Buffer.from(process.env.APN_KEY_CONTENT, 'base64').toString('ascii'),
    keyId: process.env.APN_KEY_ID,
    teamId: process.env.APN_TEAM_ID,
  },
  production: process.env.NODE_ENV === 'production',
};

const apnProvider = new apn.Provider(options);
console.log('APNs provider initialized with options:', {
  keyId: options.token.keyId,
  teamId: options.token.teamId,
  production: options.production,
});

/**
 * Send a notification to a user with multiple devices
 * @param {number} userId - User ID
 * @param {object} notification - Notification data object
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {object} notification.data - Custom data payload
 * @returns {Promise<void>}
 */
async function sendToUser(userId, notification) {
  try {
    // Check if the user has enabled this notification type
    if (notification.type) {
      const settingsQuery = `
        SELECT ${notification.type}_enabled 
        FROM user_notification_settings 
        WHERE user_id = $1
      `;
      const settingsResult = await pool.query(settingsQuery, [userId]);
      
      if (settingsResult.rows.length > 0) {
        const setting = settingsResult.rows[0][`${notification.type}_enabled`];
        if (setting === false) {
          console.log(`User ${userId} has disabled ${notification.type} notifications`);
          return;
        }
      }
    }

    // Get device tokens for this user
    const deviceQuery = `
      SELECT device_token, platform 
      FROM user_devices 
      WHERE user_id = $1
    `;
    const devices = await pool.query(deviceQuery, [userId]);
    
    if (devices.rows.length === 0) {
      console.log(`No devices found for user ${userId}`);
      return;
    }

    // Send to each iOS device
    const iosDevices = devices.rows.filter(device => device.platform === 'ios');
    if (iosDevices.length > 0) {
      await sendToiOSDevices(iosDevices.map(d => d.device_token), notification);
    }
    
    console.log(`Notification sent to ${iosDevices.length} iOS devices for user ${userId}`);
  } catch (error) {
    console.error('Error sending notification to user:', error);
  }
}

/**
 * Send a notification to multiple iOS devices
 * @param {string[]} deviceTokens - Array of device tokens
 * @param {object} notification - Notification data
 * @returns {Promise<object>} - APNs response
 */
async function sendToiOSDevices(deviceTokens, notification) {
  const note = new apn.Notification();

  note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires in 1 hour
  note.badge = 1;
  note.sound = "default";
  note.alert = {
    title: notification.title,
    body: notification.body,
  };
  note.payload = notification.data || {};
  note.topic = process.env.APP_BUNDLE_ID; 

  try {
    const result = await apnProvider.send(note, deviceTokens);
    
    if (result.sent.length > 0) {
      console.log(`Successfully sent to ${result.sent.length} devices`);
    }
    if (result.failed.length > 0) {
      console.log(`Failed to send to ${result.failed.length} devices:`, result.failed);
    }
    
    return result;
  } catch (error) {
    console.error('Error sending APNs notification:', error);
    throw error;
  }
}

module.exports = {
  sendToUser
};