import { supabase } from '../config/db.js';

/**
 * Register / update FCM token for a user device
 */
export async function registerDeviceToken(req, res) {
  try {
    const { userId, fcmToken, platform } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({
        error: 'userId and fcmToken are required'
      });
    }

    const { error } = await supabase.from('user_devices').upsert({
      user_id: userId,
      fcm_token: fcmToken,
      platform: platform || 'android'
    });

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({
      success: true,
      message: 'Device token registered'
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}