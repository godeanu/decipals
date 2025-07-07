// themeService.js
const pool = require('../db');
const cron = require('node-cron');

let dailyResetJob = null;


async function initializeScheduler() {
  try {
    console.log('[SCHEDULER] Initializing daily theme reset scheduler');
    
    if (dailyResetJob) {
      dailyResetJob.stop();
      dailyResetJob = null;
    }
    
    dailyResetJob = cron.schedule('0 0 * * *', async () => {
      console.log('[SCHEDULER] Running daily feed reset at midnight');
      await performDailyReset();
    });
    
    console.log('[SCHEDULER] Daily reset scheduler initialized');
    
    await updateCurrentTheme();
    
    return true;
  } catch (error) {
    console.error('[SCHEDULER] Error initializing scheduler:', error);
    return false;
  }
}


async function updateCurrentTheme() {
  try {
    console.log('[THEME] Updating current theme based on today\'s schedule');
    
    const query = `
      SELECT t.id, t.title, t.description
      FROM scheduled_themes st
      JOIN themes t ON st.theme_id = t.id
      WHERE st.scheduled_date = CURRENT_DATE
      AND t.active = true
      LIMIT 1
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length > 0) {
      const theme = result.rows[0];
      console.log(`[THEME] Setting theme ${theme.id} (${theme.title}) as current theme`);
      
      await pool.query(
        `UPDATE app_settings SET value = $1 WHERE key = 'current_theme_id'`,
        [theme.id.toString()]
      );
    } else {
      console.log('[THEME] No theme scheduled for today, clearing current theme');
      await pool.query(
        `UPDATE app_settings SET value = '' WHERE key = 'current_theme_id'`
      );
    }
    
    return true;
  } catch (error) {
    console.error('[THEME] Error updating current theme:', error);
    return false;
  }
}


async function performDailyReset() {
  try {
    console.log('[RESET] Performing daily feed reset');
    
    await updateCurrentTheme();
    
  
    console.log('[RESET] Daily feed reset completed successfully');
    return true;
  } catch (error) {
    console.error('[RESET] Error during daily feed reset:', error);
    return false;
  }
}

async function getScheduledTheme() {
  try {
    const query = `
      SELECT t.id, t.title, t.description
      FROM scheduled_themes st
      JOIN themes t ON st.theme_id = t.id
      WHERE st.scheduled_date = CURRENT_DATE
      AND t.active = true
      LIMIT 1
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    } else {
      return null; 
    }
  } catch (error) {
    console.error('[THEME] Error getting scheduled theme:', error);
    return null;
  }
}


async function scheduleTheme(themeId, date) {
  try {
    console.log(`[SCHEDULER] Scheduling theme ${themeId} for ${date}`);
    
    const themeQuery = `SELECT id, title FROM themes WHERE id = $1 AND active = true`;
    const themeResult = await pool.query(themeQuery, [themeId]);
    
    if (themeResult.rows.length === 0) {
      throw new Error('Theme not found or inactive');
    }
    
    const checkQuery = `
      SELECT id FROM scheduled_themes WHERE scheduled_date = $1
    `;
    const checkResult = await pool.query(checkQuery, [date]);
    
    if (checkResult.rows.length > 0) {
      const updateQuery = `
        UPDATE scheduled_themes 
        SET theme_id = $1
        WHERE scheduled_date = $2
        RETURNING id, theme_id, scheduled_date
      `;
      
      const result = await pool.query(updateQuery, [themeId, date]);
      console.log(`[SCHEDULER] Updated existing theme for ${date}`);
      
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        await updateCurrentTheme();
      }
      
      return result.rows[0];
    } else {
      const insertQuery = `
        INSERT INTO scheduled_themes 
          (theme_id, scheduled_date)
        VALUES 
          ($1, $2)
        RETURNING id, theme_id, scheduled_date
      `;
      
      const result = await pool.query(insertQuery, [themeId, date]);
      console.log(`[SCHEDULER] Created new scheduled theme for ${date}`);
      
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        await updateCurrentTheme();
      }
      
      return result.rows[0];
    }
  } catch (error) {
    console.error('[SCHEDULER] Error scheduling theme:', error);
    throw error;
  }
}

async function getAllThemes(activeOnly = false) {
  try {
    console.log(`[THEME] Getting all themes (activeOnly=${activeOnly})`);
    let query = `SELECT * FROM themes`;
    
    if (activeOnly) {
      query += ` WHERE active = true`;
    }
    
    query += ` ORDER BY id DESC`;
    
    const result = await pool.query(query);
    console.log(`[THEME] Found ${result.rows.length} themes`);
    return result.rows;
  } catch (error) {
    console.error('[THEME] Error getting themes:', error);
    throw error;
  }
}

async function getScheduledThemes(fromDate, toDate) {
  try {
    const query = `
      SELECT 
        st.id, 
        st.scheduled_date,
        t.id as theme_id, 
        t.title, 
        t.description
      FROM scheduled_themes st
      JOIN themes t ON st.theme_id = t.id
      WHERE st.scheduled_date BETWEEN $1 AND $2
      ORDER BY st.scheduled_date
    `;
    
    const result = await pool.query(query, [fromDate, toDate]);
    return result.rows;
  } catch (error) {
    console.error('[THEME] Error getting scheduled themes:', error);
    throw error;
  }
}

async function manuallyActivateTheme(themeId) {
  try {
    console.log(`[THEME] Manually activating theme ${themeId}`);
    
    const themeQuery = `SELECT id, title FROM themes WHERE id = $1 AND active = true`;
    const themeResult = await pool.query(themeQuery, [themeId]);
    
    if (themeResult.rows.length === 0) {
      console.error(`[THEME] Theme ${themeId} not found or not active`);
      return false;
    }
    
    const today = new Date().toISOString().split('T')[0];
    await scheduleTheme(themeId, today);
    
    return true;
  } catch (error) {
    console.error('[THEME] Error manually activating theme:', error);
    return false;
  }
}

async function checkForMissedReset() {
  try {
    const query = `SELECT value FROM app_settings WHERE key = 'last_reset_date'`;
    const result = await pool.query(query);
    
    const today = new Date().toISOString().split('T')[0];
    
    if (result.rows.length === 0 || result.rows[0].value !== today) {
      console.log('[RESET] Detected missed daily reset, running now');
      await performDailyReset();
      
      await pool.query(
        `INSERT INTO app_settings (key, value) 
         VALUES ('last_reset_date', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [today]
      );
    } else {
      console.log('[RESET] Daily reset already performed today');
    }
    
    return true;
  } catch (error) {
    console.error('[RESET] Error checking for missed reset:', error);
    return false;
  }
}

module.exports = {
  initializeScheduler,
  updateCurrentTheme,
  performDailyReset,
  getScheduledTheme,
  scheduleTheme,
  getAllThemes,
  getScheduledThemes,
  manuallyActivateTheme,
  checkForMissedReset  
};