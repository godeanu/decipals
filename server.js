const express = require('express');
const cors = require('cors');
const axios = require('axios');
const pool = require('./db');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');

const notificationService = require('./services/notificationService');
const themeService = require('./services/themeService');
const moment = require('moment');

console.log("Initializing theme scheduler...");
themeService.initializeScheduler().catch(err => {
  console.error('Failed to initialize theme scheduler:', err);
});

console.log("Checking for missed reset...");
try {
  themeService.checkForMissedReset().catch(err => {
    console.error('Failed to check for missed reset:', err);
  });
} catch (err) {
  console.error('Error calling checkForMissedReset:', err);
}


const upload = multer({ storage: multer.memoryStorage() });


const { getSpotifyAuthUrl, getSpotifyTokens } = require('./spotifyAuth');
const { refreshSpotifyToken } = require('./spotifyAuth');

require('dotenv').config();

const { generateJWT } = require('./authToken');
const verifyJWT = require('./verifyJWT');

const ADMIN_USER_IDS=[1, 2];



const app = express();
app.use(cors());
app.use(express.json());
console.log("Storage Connection String:", process.env.AZURE_STORAGE_CONNECTION_STRING);

function isAdmin(req, res, next) {
  if (!ADMIN_USER_IDS.includes(req.user.id)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
}


app.get('/test', (req, res) => {
    res.send('Server is running and connected to Spotify!!');
});

app.get('/login', (req, res) => {
    const authUrl = getSpotifyAuthUrl();
    console.log('Redirecting to Spotify auth URL:', authUrl);
    res.redirect(authUrl);
});

app.post('/logout', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    

    await pool.query(
      'DELETE FROM user_devices WHERE user_id = $1',
      [userId]
    );
    
    const clearTokensQuery = `
      UPDATE users
      SET refresh_token = NULL
      WHERE id = $1
    `;
    await pool.query(clearTokensQuery, [userId]);
    res.status(200).json({ message: 'Logged out successfully!' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});


app.get('/callback', async (req, res) => {
    const code = req.query.code;
    console.log('Received code:', code);

    try {
        // Get tokens from Spotify
        const { access_token, refresh_token } = await getSpotifyTokens(code);
        console.log('Got tokens from Spotify');

        // Get user info
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const { id: spotify_id, display_name: username } = userResponse.data;
        console.log('User data:', { spotify_id, username });

        const images = userResponse.data.images; 
        let profilePicUrl = null;
        if (images && images.length > 0) {
            profilePicUrl = images[0].url; 
        }

        const userQuery = `
  INSERT INTO users (spotify_id, username, refresh_token, profile_picture_url)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (spotify_id)
  DO UPDATE SET
    username = EXCLUDED.username,
    refresh_token = EXCLUDED.refresh_token,
    profile_picture_url = CASE
      WHEN users.profile_picture_url IS NULL THEN EXCLUDED.profile_picture_url
      ELSE users.profile_picture_url
    END
  RETURNING id;
`;


        const result = await pool.query(userQuery, [spotify_id, username, refresh_token, profilePicUrl]);
        const userId = result.rows[0].id;
        console.log('User stored in database, id:', userId);

   
        const jwtToken = generateJWT(userId);
        const redirectUrl = `musicapp://callback?jwt=${encodeURIComponent(jwtToken)}`;
        console.log('Redirecting to:', redirectUrl);

        res.send(`
            <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Login Successful</title>
    <style>
        :root {
            --spotify-green: #1DB954;
            --spotify-green-dark: #1AA34A;
            --spotify-green-light: #E3F8EB;
            --text-primary: #121212;
            --text-secondary: #6B7280;
            --bg-color: #F8F9FA;
            --white: #FFFFFF;
            --shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
            --border-radius: 16px;
            --transition: all 0.25s cubic-bezier(0.65, 0, 0.35, 1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 16px;
            line-height: 1.5;
        }

        .container {
            background-color: var(--white);
            width: 100%;
            max-width: 360px;
            border-radius: var(--border-radius);
            padding: 32px 24px;
            text-align: center;
            box-shadow: var(--shadow);
            position: relative;
            overflow: hidden;
        }

        .checkmark-circle {
            position: relative;
            width: 80px;
            height: 80px;
            margin: 0 auto 24px;
        }

        .checkmark-circle-bg {
            position: absolute;
            width: 80px;
            height: 80px;
            background-color: var(--spotify-green-light);
            border-radius: 50%;
            animation: scaleIn 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .checkmark-circle-inner {
            position: absolute;
            top: 10px;
            left: 10px;
            width: 60px;
            height: 60px;
            background-color: var(--spotify-green);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: scaleIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
            opacity: 0;
            transform: scale(0.8);
        }

        .checkmark {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            animation: draw 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards;
        }

        @keyframes scaleIn {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }

        @keyframes draw {
            to { stroke-dashoffset: 0; }
        }

        .pulse {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background-color: var(--spotify-green);
            animation: pulse 2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
            opacity: 0;
        }

        @keyframes pulse {
            0% { transform: scale(0.8); opacity: 0.6; }
            100% { transform: scale(1.5); opacity: 0; }
        }

        .content {
            animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
        }

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }

        h1 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 8px;
            color: var(--text-primary);
        }

        .welcome-text {
            font-size: 16px;
            margin-bottom: 6px;
            color: var(--text-secondary);
        }

        .username {
            font-weight: 700;
            color: var(--spotify-green);
            display: inline-block;
        }

        .redirect-text {
            font-size: 15px;
            margin-bottom: 24px;
            color: var(--text-secondary);
        }

        .countdown {
            font-weight: 600;
        }

        .button {
            display: block;
            width: 100%;
            background-color: var(--spotify-green);
            color: var(--white);
            font-weight: 600;
            font-size: 16px;
            padding: 14px 16px;
            border-radius: 50px;
            text-decoration: none;
            transition: var(--transition);
            box-shadow: 0 4px 12px rgba(29, 185, 84, 0.25);
            margin-bottom: 12px;
            position: relative;
            overflow: hidden;
            border: none;
            outline: none;
            -webkit-appearance: none;
        }

        .button:active {
            background-color: var(--spotify-green-dark);
            transform: translateY(2px);
            box-shadow: 0 2px 8px rgba(29, 185, 84, 0.25);
        }

        .button-ripple {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%);
            transform: scale(0);
            opacity: 0;
            pointer-events: none;
        }

        .button:active .button-ripple {
            animation: ripple 0.6s ease-out;
        }

        @keyframes ripple {
            0% { transform: scale(0); opacity: 0.4; }
            100% { transform: scale(2.5); opacity: 0; }
        }

        .note {
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 16px;
            opacity: 0.8;
        }

        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            vertical-align: text-bottom;
            border: 2px solid rgba(29, 185, 84, 0.25);
            border-right-color: var(--spotify-green);
            border-radius: 50%;
            animation: spinner 0.75s linear infinite;
            margin-left: 6px;
        }

        @keyframes spinner {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="checkmark-circle">
            <div class="checkmark-circle-bg"></div>
            <div class="pulse"></div>
            <div class="checkmark-circle-inner">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="checkmark">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
        </div>
        
        <div class="content">
            <h1>Login Successful!</h1>
            <p class="welcome-text">Welcome, <span class="username">${username}</span></p>
            <p class="redirect-text">Returning to app in <span class="countdown">3</span></p>
            
            <a href="${redirectUrl}" class="button">
                Return to App
                <span class="button-ripple"></span>
            </a>
            
            <p class="note">If you're not redirected automatically, tap the button above</p>
        </div>
    </div>
    
    <script>
                // Improved redirection script
                let count = 3;
                const countdownEl = document.querySelector('.countdown');
                const redirectTextEl = document.querySelector('.redirect-text');
                const redirectUrl = "${redirectUrl}";
                
                // Function to attempt redirection
                function attemptRedirect() {
                    // Try multiple redirection methods
                    window.location.href = redirectUrl;
                    window.location.replace(redirectUrl);
                    
                    // For in-app browsers
                    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bridge) {
                        window.webkit.messageHandlers.bridge.postMessage({
                            message: 'redirectToApp',
                            url: redirectUrl
                        });
                    }
                }
                
                // Start countdown
                const countdownInterval = setInterval(() => {
                    count--;
                    if (count > 0) {
                        countdownEl.textContent = count;
                    } else {
                        clearInterval(countdownInterval);
                        redirectTextEl.innerHTML = 'Redirecting you now <span class="spinner"></span>';
                        
                        // Attempt redirect
                        attemptRedirect();
                        
                        // Try again after a short delay as fallback
                        setTimeout(attemptRedirect, 500);
                    }
                }, 1000);
                
                // Make button reliably redirect
                document.querySelector('.button').addEventListener('click', function(e) {
                    e.preventDefault();
                    attemptRedirect();
                    
                    // Try another method as backup
                    setTimeout(() => {
                        window.open(redirectUrl, '_self');
                    }, 100);
                });
                
                // Try immediate redirect for some browsers
                setTimeout(attemptRedirect, 500);
            </script>
</body>
</html>
        `);
    } catch (error) {
        console.error('Callback error:', error);
        res.status(500).send('Authentication failed. Error: ' + error.message);
    }
});

// ...
app.get('/search-tracks', verifyJWT, async (req, res) => {
  const userId = req.user.id;        
  const q = req.query.q;             
  
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter: q' });
  }

  try {
    const userRes = await pool.query('SELECT refresh_token FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const refreshToken = userRes.rows[0].refresh_token;
    if (!refreshToken) {
      return res.status(400).json({ error: 'No refresh token stored for this user' });
    }

    const tokenData = await refreshSpotifyToken(refreshToken);
    const accessToken = tokenData.access_token;

    const searchUrl = `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(q)}`;
    const searchResponse = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const tracks = searchResponse.data.tracks.items || [];
    res.json({ tracks });
  } catch (error) {
    console.error('Error searching tracks:', error.message);
    res.status(500).json({ error: 'Could not perform track search' });
  }
});

app.post('/daily-post', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  const { song_name, artist_name, spotify_track_id, album_image_url, spotify_url, note } = req.body;
  
  try {
    let currentThemeId = null;
    const themeQuery = `SELECT value FROM app_settings WHERE key = 'current_theme_id'`;
    const themeResult = await pool.query(themeQuery);
    
    if (themeResult.rows.length > 0 && themeResult.rows[0].value) {
      const parsedId = parseInt(themeResult.rows[0].value);
      if (!isNaN(parsedId) && parsedId > 0) {
        currentThemeId = parsedId;
      }
    }
    
    console.log(`Post with theme_id: ${currentThemeId || 'NULL'}`);
    
    const existingPostQuery = `
      SELECT id FROM daily_posts
      WHERE user_id = $1 AND post_date::date = CURRENT_DATE
    `;
    const existingPostResult = await pool.query(existingPostQuery, [userId]);
    
    if (existingPostResult.rows.length > 0) {
      const postId = existingPostResult.rows[0].id;
      
      const updateQuery = `
        UPDATE daily_posts
        SET song_name = $1, 
            artist_name = $2, 
            spotify_track_id = $3, 
            album_image_url = $4, 
            spotify_url = $5, 
            note = $6,
            theme_id = $7,
            post_date = NOW()
        WHERE id = $8
      `;
      
      await pool.query(updateQuery, [
        song_name,
        artist_name,
        spotify_track_id,
        album_image_url,
        spotify_url,
        note,
        currentThemeId, 
        postId
      ]);
      
      res.status(200).json({ message: 'Today\'s song updated successfully!' });
    } else {
      const postQuery = `
        INSERT INTO daily_posts
          (user_id, song_name, artist_name, spotify_track_id, album_image_url, spotify_url, post_date, note, theme_id)
        VALUES
          ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
      `;
      
      await pool.query(postQuery, [
        userId,
        song_name,
        artist_name,
        spotify_track_id,
        album_image_url,
        spotify_url,
        note,
        currentThemeId 
      ]);
    
      res.status(200).json({ message: 'Song posted successfully!' });
    }
  } catch (error) {
    console.error('Error saving song post:', error);
    res.status(500).json({ error: 'Error saving song post: ' + error.message });
  }
});
  
  app.post('/send-friend-request', verifyJWT, async (req, res) => {
    const userId = req.user.id; 
    const { friendUsername } = req.body;
  
    try {
      const friendQuery = 'SELECT id FROM users WHERE custom_username = $1';
      const friendResult = await pool.query(friendQuery, [friendUsername]);
  
      if (friendResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const friendId = friendResult.rows[0].id;
  
      const existingRequestQuery = `
        SELECT * FROM friends
        WHERE (user_id = $1 AND friend_id = $2)
           OR (user_id = $2 AND friend_id = $1)
      `;
      const existingResult = await pool.query(existingRequestQuery, [userId, friendId]);
  
      if (existingResult.rows.length > 0) {
        return res.status(400).json({ message: 'Friend request already exists or you are already friends' });
      }
  
      const addFriendQuery = `
        INSERT INTO friends (user_id, friend_id, status)
        VALUES ($1, $2, 'pending')
      `;
      await pool.query(addFriendQuery, [userId, friendId]);
      res.status(200).json({ message: 'Friend request sent!' });
    } catch (error) {
      console.error('Error sending friend request:', error);
      res.status(500).json({ error: 'Error sending friend request' });
    }
  });

  app.get('/pending-requests', verifyJWT, async (req, res) => {
    const userId = req.user.id;
  
    try {
      const pendingQuery = `
        SELECT f.id AS friend_row_id,
               f.user_id AS requester_id,
               f.friend_id AS target_id,
               f.status,
               u.username AS requester_username,
               u.custom_username AS requester_custom_username,
               u.profile_picture_url AS requester_profile_pic
          FROM friends f
          JOIN users u
            ON u.id = f.user_id
         WHERE f.friend_id = $1
           AND f.status = 'pending'
      `;
      const result = await pool.query(pendingQuery, [userId]);
  
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return res.status(500).json({ error: 'Error fetching pending friend requests' });
    }
  });
  
  app.delete('/reject-friend-request', verifyJWT, async (req, res) => {
    const userId = req.user.id;
    const { friendRowId } = req.body;
  
    try {
      const deleteQuery = `
        DELETE FROM friends
         WHERE id = $1
           AND friend_id = $2  -- ensure the current user is the target
      `;
      await pool.query(deleteQuery, [friendRowId, userId]);
      res.status(200).json({ message: 'Friend request rejected!' });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      res.status(500).json({ error: 'Error rejecting friend request' });
    }
  });
  
  
  app.put('/accept-friend-request', verifyJWT, async (req, res) => {
    const userId = req.user.id;
    const { friendId } = req.body;
  
    try {
      const updateFriendQuery = `
        UPDATE friends
        SET status = 'accepted'
        WHERE user_id = $1 AND friend_id = $2
           OR user_id = $2 AND friend_id = $1
      `;
      await pool.query(updateFriendQuery, [friendId, userId]);
      res.status(200).json({ message: 'Friend request accepted!' });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      res.status(500).json({ error: 'Error accepting friend request' });
    }
  });
  
  app.get('/friends', verifyJWT, async (req, res) => {
    const userId = req.user.id;
  
    try {
      const friendsQuery = `
        SELECT u.id, u.username, u.custom_username, u.profile_picture_url
        FROM friends f
        JOIN users u
          ON (u.id = f.friend_id OR u.id = f.user_id)
        WHERE (f.user_id = $1 OR f.friend_id = $1)
          AND f.status = 'accepted'
          AND u.id != $1
      `;
      const result = await pool.query(friendsQuery, [userId]);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching friends:', error);
      res.status(500).json({ error: 'Error fetching friends' });
    }
  });
  
app.get('/feed', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const userPostQuery = `
      SELECT id FROM daily_posts 
      WHERE user_id = $1 AND post_date::date = CURRENT_DATE
    `;
    const userPostResult = await pool.query(userPostQuery, [userId]);
    const hasUserPosted = userPostResult.rows.length > 0;
    
    if (!hasUserPosted) {
      const theme = await themeService.getScheduledTheme();
      
      return res.json({
        locked: true,
        message: 'Post your daily song to see what your friends are sharing today!',
        theme: theme 
      });
    }
    
 
    const friendIdsQuery = `
      SELECT friend_id AS fid
      FROM friends
      WHERE user_id = $1 AND status = 'accepted'
      UNION
      SELECT user_id AS fid
      FROM friends
      WHERE friend_id = $1 AND status = 'accepted'
    `;
    const friendIdsResult = await pool.query(friendIdsQuery, [userId]);
    const friendIds = friendIdsResult.rows.map(row => row.fid);
    const allIds = [Number(userId), ...friendIds];
    
    // Get today's posts
    const feedQuery = `
      SELECT 
        dp.id,
        dp.user_id AS user_id,
        dp.song_name,
        dp.artist_name,
        dp.album_image_url,
        dp.spotify_url,
        dp.spotify_track_id,
        dp.post_date,
        dp.note,
        dp.theme_id,
        u.username,
        u.custom_username,
        u.profile_picture_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = dp.id) AS like_count,
        CASE WHEN EXISTS (
          SELECT 1 FROM likes WHERE likes.post_id = dp.id AND likes.user_id = $2
        ) THEN true ELSE false END AS user_liked
      FROM daily_posts dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.user_id = ANY ($1)
      AND dp.post_date::date = CURRENT_DATE
      ORDER BY dp.post_date DESC
    `;
    
    const feedResult = await pool.query(feedQuery, [allIds, userId]);
    console.log(`[FEED] Found ${feedResult.rows.length} posts today`);
    
    return res.json(feedResult.rows);
  } catch (error) {
    console.error('[FEED] Error fetching feed:', error);
    res.status(500).json({ error: 'Error fetching feed' });
  }
});

  app.get('/profile', verifyJWT, async (req, res) => {
    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    try {
      const result = await pool.query(`
        SELECT id, username, custom_username, profile_picture_url
        FROM users
        WHERE id = $1
      `, [userId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error fetching profile:', err);
      res.status(500).json({ error: 'Error fetching profile' });
    }
  });
  
  app.put('/update-profile', verifyJWT, async (req, res) => {
    const userId = req.user.id;
    const { customUsername, profilePictureUrl } = req.body;
  
    if (!customUsername || customUsername.trim() === '') {
      return res.status(400).json({ error: 'Custom username cannot be empty.' });
    }
  
    try {
      if (profilePictureUrl) {
        await pool.query(`
          UPDATE users
          SET custom_username = $1,
              profile_picture_url = $2
          WHERE id = $3
        `, [customUsername, profilePictureUrl, userId]);
      } else {
        await pool.query(`
          UPDATE users
          SET custom_username = $1
          WHERE id = $2
        `, [customUsername, userId]);
      }
      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Update profile error:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'This username is already taken.' });
      }
      res.status(500).json({ error: 'Error updating profile' });
    }
  });
  
  


  app.post('/toggle-like', verifyJWT, async (req, res) => {
    const userId = req.user.id;
    const { postId } = req.body;
  
    try {
      // Check if the user already liked this post
      const checkQuery = `
        SELECT id FROM likes
        WHERE user_id = $1 AND post_id = $2
      `;
      const checkResult = await pool.query(checkQuery, [userId, postId]);
  
      if (checkResult.rows.length > 0) {
        // Already liked -> unlike (remove)
        const deleteQuery = `
          DELETE FROM likes
          WHERE user_id = $1 AND post_id = $2
        `;
        await pool.query(deleteQuery, [userId, postId]);
        return res.json({ message: 'Post unliked', liked: false });
      } else {
        // Not liked -> like (insert)
        const insertQuery = `
          INSERT INTO likes (user_id, post_id)
          VALUES ($1, $2)
        `;
        await pool.query(insertQuery, [userId, postId]);


        // Get post owner for notification
      const postQuery = `
      SELECT dp.user_id, dp.song_name, u.custom_username 
      FROM daily_posts dp
      JOIN users u ON u.id = dp.user_id
      WHERE dp.id = $1
    `;
    const postResult = await pool.query(postQuery, [postId]);
    
    if (postResult.rows.length > 0) {
      const post = postResult.rows[0];
      
      // Don't notify if user is liking their own post
      if (post.user_id !== userId) {
        const userQuery = `SELECT custom_username FROM users WHERE id = $1`;
        const userResult = await pool.query(userQuery, [userId]);
        const likerUsername = userResult.rows[0]?.custom_username || 'Someone';
        
        const notificationService = require('./services/notificationService');
        await notificationService.sendToUser(post.user_id, {
          title: 'New Like!',
          body: `${likerUsername} liked your post: ${post.song_name}`,
          data: {
            type: 'like',
            postId: postId
          }
        });
      }
    }
    
    return res.json({ message: 'Post liked', liked: true });
  }
} catch (error) {
  console.error('Error toggling like:', error);
  return res.status(500).json({ error: 'Error toggling like' });
}
});

  app.post('/add-comment', verifyJWT, async (req, res) => {
    const userId = req.user.id;
    const { postId, comment } = req.body;
    try {
      const insertQuery = `
        INSERT INTO comments (user_id, post_id, comment)
        VALUES ($1, $2, $3)
        RETURNING id
      `;
      await pool.query(insertQuery, [userId, postId, comment]);
    
    const postQuery = `
      SELECT dp.user_id, dp.song_name, u.custom_username 
      FROM daily_posts dp
      JOIN users u ON u.id = dp.user_id
      WHERE dp.id = $1
    `;
    const postResult = await pool.query(postQuery, [postId]);
    
    if (postResult.rows.length > 0) {
      const post = postResult.rows[0];
      
      if (post.user_id !== userId) {
        const userQuery = `SELECT custom_username FROM users WHERE id = $1`;
        const userResult = await pool.query(userQuery, [userId]);
        const commenterUsername = userResult.rows[0]?.custom_username || 'Someone';
        
        const notificationService = require('./services/notificationService');
        await notificationService.sendToUser(post.user_id, {
          title: 'New Comment!',
          body: `${commenterUsername} commented on your post: ${post.song_name}`,
          data: {
            type: 'comment',
            postId: postId
          }
        });
      }
    }
    
    res.json({ message: 'Comment added successfully' });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Error adding comment' });
  }
});
  
  app.get('/comments', async (req, res) => {
    const { postId } = req.query;
    try {
      const commentsQuery = `
        SELECT c.*,
               u.username, 
               u.custom_username,
               u.profile_picture_url
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = $1
        ORDER BY c.created_at ASC
      `;
      const result = await pool.query(commentsQuery, [postId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Error fetching comments' });
    }
  });
  
  app.delete('/delete-comment', verifyJWT, async (req, res) => {
    const userId = req.user.id;
    const { commentId } = req.body;
    try {
      const commentQuery = `
        SELECT c.user_id AS commenter_id, dp.user_id AS post_owner_id
        FROM comments c
        JOIN daily_posts dp ON c.post_id = dp.id
        WHERE c.id = $1
      `;
      const result = await pool.query(commentQuery, [commentId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      const { commenter_id, post_owner_id } = result.rows[0];
      console.log('delete-comment:', { userId, commenter_id, post_owner_id });

  
      if (Number(userId) !== commenter_id && Number(userId) !== post_owner_id) {
        return res.status(403).json({ error: 'Not authorized to delete this comment' });
      }
      console.log('Attempting to delete comment', commentId, 'by user', userId);
      console.log('commenter_id=', commenter_id, 'post_owner_id=', post_owner_id);

      // 3) Delete
      await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ error: 'Error deleting comment' });
    }
  });


  app.post('/upload-profile-pic', verifyJWT, upload.single('image'), async (req, res) => {
    try {
      const userId = req.user.id;
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
  
      //Get the file’s buffer from multer
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype || 'image/jpeg';
  
      //Connect to Azure Blob
      const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
      const containerClient = blobServiceClient.getContainerClient('profile');
  
      //Create a unique blob name, e.g. userId + timestamp
      const blobName = `profile/${userId}/${Date.now()}.jpg`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
      await blockBlobClient.uploadData(fileBuffer, {
        blobHTTPHeaders: { blobContentType: mimeType },
      });
  
      const imageUrl = blockBlobClient.url;
  
      await pool.query(`
        UPDATE users
        SET profile_picture_url = $1
        WHERE id = $2
      `, [imageUrl, userId]);
  
      return res.json({
        message: 'Profile pic uploaded successfully',
        url: imageUrl,
      });
    } catch (error) {
      console.error('Error uploading to Azure:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

app.get('/search-users', verifyJWT, async (req, res) => {
  const q = req.query.q || '';
  try {
    const searchQuery = `
      SELECT id, username, custom_username, profile_picture_url
      FROM users
      WHERE custom_username ILIKE $1  -- case-insensitive
    `;
    
    const result = await pool.query(searchQuery, [q + '%']);

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Error searching users' });
  }
});


app.get('/user/:userId', verifyJWT, async (req, res) => {
  const targetUserId = req.params.userId;
  try {
    const result = await pool.query(`
      SELECT id, username, custom_username, profile_picture_url
      FROM users
      WHERE id = $1
    `, [targetUserId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

app.put('/daily-post/:postId/toggle-visibility', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  const postId = req.params.postId;
  
  try {
    const checkQuery = 'SELECT id, hidden FROM daily_posts WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [postId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Post not found or you do not have permission' });
    }
    
    const currentHiddenState = checkResult.rows[0].hidden || false;
    
    const updateQuery = 'UPDATE daily_posts SET hidden = $1 WHERE id = $2 RETURNING id, hidden';
    const updateResult = await pool.query(updateQuery, [!currentHiddenState, postId]);
    
    res.json({
      id: updateResult.rows[0].id,
      hidden: updateResult.rows[0].hidden,
      message: updateResult.rows[0].hidden ? 'Post hidden' : 'Post visible'
    });
  } catch (error) {
    console.error('Error toggling post visibility:', error);
    res.status(500).json({ error: 'Error updating post' });
  }
});

app.get('/user/:userId/posts', verifyJWT, async (req, res) => {
  const targetUserId = req.params.userId;
  const viewerId = req.user.id;
  const isOwnProfile = targetUserId == viewerId;
  
  try {
    let postsQuery = `
      SELECT 
        dp.id,
        dp.song_name,
        dp.artist_name,
        dp.album_image_url,
        dp.spotify_url,
        dp.spotify_track_id,
        dp.post_date,
        dp.hidden
      FROM daily_posts dp
      WHERE dp.user_id = $1
    `;
    
    if (!isOwnProfile) {
      postsQuery += ` AND (dp.hidden = false OR dp.hidden IS NULL)`;
    }
    
    postsQuery += ` ORDER BY dp.post_date DESC LIMIT 800`;
    
    const result = await pool.query(postsQuery, [targetUserId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user posts:', err);
    res.status(500).json({ error: 'Error fetching user posts' });
  }
});

app.get('/user/:userId/top-tracks', verifyJWT, async (req, res) => {
  const targetUserId = req.params.userId;
  try {
    const topTracksQuery = `
      SELECT 
        id,
        track_name,
        artist_name,
        album_image_url,
        spotify_track_id,
        display_order
      FROM user_top_tracks
      WHERE user_id = $1
      ORDER BY display_order ASC
    `;
    
    const result = await pool.query(topTracksQuery, [targetUserId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching top tracks:', err);
    res.status(500).json({ error: 'Error fetching top tracks' });
  }
});

app.get('/spotify/top-tracks', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  
  try {
    console.log('Fetching top tracks for user:', userId);
    
    const userRes = await pool.query('SELECT refresh_token FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      console.log('User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }
    
    const refreshToken = userRes.rows[0].refresh_token;
    if (!refreshToken) {
      console.log('No refresh token for user');
      return res.status(400).json({ error: 'No refresh token stored for this user' });
    }
    
    console.log('Getting fresh access token from Spotify');
    const tokenData = await refreshSpotifyToken(refreshToken);
    console.log('Got access token:', tokenData.access_token ? 'YES' : 'NO');
    const accessToken = tokenData.access_token;
    
    console.log('Calling Spotify API to get top tracks');
    const topTracksResponse = await axios.get(`https://api.spotify.com/v1/me/top/tracks`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        time_range: 'short_term', 
        limit: 30 
      }
    });
    
    console.log('Got response from Spotify API');
    const tracks = topTracksResponse.data.items.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0].name,
      album_image: track.album.images[0]?.url,
      spotify_url: track.external_urls.spotify
    }));
    
    res.json({ tracks });
  } catch (error) {
    console.error('Detailed error fetching top tracks:');
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    } else if (error.request) {
      console.error('Error request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch top tracks', 
      detail: error.response?.data || error.message 
    });
  }
});

app.delete('/top-tracks/all', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const deleteQuery = `
      DELETE FROM user_top_tracks
      WHERE user_id = $1
      RETURNING id
    `;
    
    await pool.query(deleteQuery, [userId]);
    res.json({ message: 'All tracks removed successfully' });
  } catch (err) {
    console.error('Error removing all tracks:', err);
    res.status(500).json({ error: 'Error removing tracks' });
  }
});


app.post('/top-tracks', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  const { trackName, artistName, albumImageUrl, spotifyTrackId, displayOrder } = req.body;
  
  try {
    const countQuery = `SELECT COUNT(*) as count FROM user_top_tracks WHERE user_id = $1`;
    const countResult = await pool.query(countQuery, [userId]);
    
    if (countResult.rows[0].count >= 10 && displayOrder === countResult.rows[0].count) {
      return res.status(400).json({ error: 'Maximum 10 top tracks allowed' });
    }
    
    const upsertQuery = `
      INSERT INTO user_top_tracks
        (user_id, track_name, artist_name, album_image_url, spotify_track_id, display_order)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, spotify_track_id) 
      DO UPDATE SET
        display_order = $6
      RETURNING *
    `;
    
    const result = await pool.query(upsertQuery, [
      userId,
      trackName,
      artistName,
      albumImageUrl,
      spotifyTrackId,
      displayOrder
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding top track:', err);
    res.status(500).json({ error: 'Error adding top track' });
  }
});

app.get('/user/me/top-tracks', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_top_tracks'
      );
    `;
    const tableExists = await pool.query(checkTableQuery);
    
    if (!tableExists.rows[0].exists) {
      console.log('user_top_tracks table does not exist');
      return res.json([]);
    }
    
    const topTracksQuery = `
      SELECT 
        id,
        track_name,
        artist_name,
        album_image_url,
        spotify_track_id,
        display_order
      FROM user_top_tracks
      WHERE user_id = $1
      ORDER BY display_order ASC
    `;
    
    const result = await pool.query(topTracksQuery, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching top tracks:', err);
    res.json([]);
  }
});

app.delete('/daily-post/:postId', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  const postId = req.params.postId;
  
  try {
    const checkQuery = `
      SELECT * FROM daily_posts
      WHERE id = $1 AND user_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [postId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found or you do not have permission to delete it' });
    }
    
    const postDate = new Date(checkResult.rows[0].post_date);
    const isToday = postDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
    
    const deleteQuery = `
      DELETE FROM daily_posts
      WHERE id = $1
    `;
    await pool.query(deleteQuery, [postId]);
    
    const feedLocked = isToday;
    
    res.json({ 
      message: 'Post deleted successfully',
      feedLocked: feedLocked
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Error deleting post' });
  }
});

app.put('/daily-post/:postId/update-note', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  const postId = req.params.postId;
  const { note } = req.body;
  
  try {
    const checkQuery = 'SELECT id FROM daily_posts WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [postId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Post not found or you do not have permission' });
    }
    
    const updateQuery = 'UPDATE daily_posts SET note = $1 WHERE id = $2 RETURNING id, note';
    const updateResult = await pool.query(updateQuery, [note, postId]);
    
    res.json({
      id: updateResult.rows[0].id,
      note: updateResult.rows[0].note,
      message: 'Note updated successfully'
    });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Error updating note' });
  }
});

app.post('/register-device', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  const { deviceToken, platform } = req.body;
  
  try {
    const query = `
      INSERT INTO user_devices (user_id, device_token, platform)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, device_token) 
      DO UPDATE SET platform = $3, created_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    
    await pool.query(query, [userId, deviceToken, platform]);
    res.status(200).json({ message: 'Device registered successfully' });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Error registering device' });
  }
});


app.get('/feed/check-lock-status', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  
  try {
    console.log(`[LOCK] Checking feed lock status for user ${userId}`);
    
    const theme = await themeService.getScheduledTheme();
    
    const userPostQuery = `
      SELECT id FROM daily_posts 
      WHERE user_id = $1 AND post_date::date = CURRENT_DATE
    `;
    const userPostResult = await pool.query(userPostQuery, [userId]);
    const hasUserPosted = userPostResult.rows.length > 0;
    
    console.log(`[LOCK] User ${userId} has ${hasUserPosted ? '' : 'not '}posted today`);
    
    return res.json({
      locked: !hasUserPosted,
      theme: theme 
    });
  } catch (error) {
    console.error('[LOCK] Error checking feed lock status:', error);
    res.status(500).json({ error: 'Error checking feed lock status' });
  }
});

// Register device token
app.post('/register-device', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  const { deviceToken, platform } = req.body;
  
  if (!deviceToken || !platform) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const query = `
      INSERT INTO user_devices (user_id, device_token, platform, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, device_token) 
      DO UPDATE SET 
        platform = $3,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    
    await pool.query(query, [userId, deviceToken, platform]);
    
    const settingsQuery = `
      INSERT INTO user_notification_settings (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `;
    await pool.query(settingsQuery, [userId]);
    
    res.json({ success: true, message: 'Device registered successfully' });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Error registering device' });
  }
});

app.put('/notification-settings', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  const { dailyTheme, likes, comments, friendRequests } = req.body;
  
  try {
    const updateFields = [];
    const queryParams = [userId];
    let paramIndex = 2;
    
    if (dailyTheme !== undefined) {
      updateFields.push(`daily_theme_enabled = $${paramIndex++}`);
      queryParams.push(dailyTheme);
    }
    
    if (likes !== undefined) {
      updateFields.push(`likes_enabled = $${paramIndex++}`);
      queryParams.push(likes);
    }
    
    if (comments !== undefined) {
      updateFields.push(`comments_enabled = $${paramIndex++}`);
      queryParams.push(comments);
    }
    
    if (friendRequests !== undefined) {
      updateFields.push(`friend_requests_enabled = $${paramIndex++}`);
      queryParams.push(friendRequests);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No settings provided to update' });
    }
    
    const query = `
      INSERT INTO user_notification_settings (
        user_id, 
        ${dailyTheme !== undefined ? 'daily_theme_enabled,' : ''} 
        ${likes !== undefined ? 'likes_enabled,' : ''} 
        ${comments !== undefined ? 'comments_enabled,' : ''} 
        ${friendRequests !== undefined ? 'friend_requests_enabled,' : ''} 
        updated_at
      )
      VALUES (
        $1, 
        ${dailyTheme !== undefined ? `$${queryParams.indexOf(dailyTheme) + 1},` : ''} 
        ${likes !== undefined ? `$${queryParams.indexOf(likes) + 1},` : ''} 
        ${comments !== undefined ? `$${queryParams.indexOf(comments) + 1},` : ''} 
        ${friendRequests !== undefined ? `$${queryParams.indexOf(friendRequests) + 1},` : ''} 
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        ${updateFields.join(', ')},
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await pool.query(query, queryParams);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Error updating notification settings' });
  }
});

app.get('/notification-settings', verifyJWT, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const query = `
      SELECT 
        daily_theme_enabled,
        likes_enabled,
        comments_enabled,
        friend_requests_enabled
      FROM user_notification_settings
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.json({
        daily_theme_enabled: true,
        likes_enabled: true,
        comments_enabled: true,
        friend_requests_enabled: true
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting notification settings:', error);
    res.status(500).json({ error: 'Error getting notification settings' });
  }
});

app.get('/daily-theme', verifyJWT, async (req, res) => {
  try {
    const theme = await themeService.getScheduledTheme();
    
    if (!theme) {
      return res.status(404).json({ error: 'No theme scheduled for today' });
    }
    
    res.json({
      id: theme.id,
      title: theme.title,
      description: theme.description
    });
  } catch (error) {
    console.error('Error getting daily theme:', error);
    res.status(500).json({ error: 'Error getting daily theme' });
  }
});

app.get('/admin/themes', verifyJWT, isAdmin, async (req, res) => {
  try {
    const themes = await themeService.getAllThemes(false);
    res.json(themes);
  } catch (error) {
    console.error('Error getting themes:', error);
    res.status(500).json({ error: 'Error getting themes' });
  }
});

app.post('/admin/themes', verifyJWT, isAdmin, async (req, res) => {
  const { title, description } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  try {
    const query = `
      INSERT INTO themes (title, description)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    const result = await pool.query(query, [title, description || null]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating theme:', error);
    res.status(500).json({ error: 'Error creating theme' });
  }
});

app.put('/admin/themes/:id', verifyJWT, isAdmin, async (req, res) => {
  const themeId = req.params.id;
  const { title, description, active } = req.body;
  
  try {
    const updateFields = [];
    const queryParams = [themeId];
    let paramIndex = 2;
    
    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      queryParams.push(title);
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      queryParams.push(description);
    }
    
    if (active !== undefined) {
      updateFields.push(`active = $${paramIndex++}`);
      queryParams.push(active);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    const query = `
      UPDATE themes
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({ error: 'Error updating theme' });
  }
});


app.post('/admin/schedule-theme', verifyJWT, isAdmin, async (req, res) => {
  const { themeId, date } = req.body;
  
  if (!themeId || !date) {
    return res.status(400).json({ error: 'Theme ID and date are required' });
  }
  
  try {
    const scheduledTheme = await themeService.scheduleTheme(themeId, date);
    
    res.json({
      success: true,
      message: `Theme scheduled for ${date}`,
      data: scheduledTheme
    });
  } catch (error) {
    console.error('Error scheduling theme:', error);
    res.status(500).json({ error: error.message || 'Error scheduling theme' });
  }
});

app.get('/admin/scheduled-themes', verifyJWT, isAdmin, async (req, res) => {
  const { from, to } = req.query;
  const moment = require('moment');
  
  try {
    const fromDate = from ? from : moment().format('YYYY-MM-DD');
    const toDate = to ? to : moment().add(30, 'days').format('YYYY-MM-DD');
    
    console.log(`Fetching scheduled themes from ${fromDate} to ${toDate}`);
    
    const scheduledThemes = await themeService.getScheduledThemes(fromDate, toDate);
    
    res.json(scheduledThemes);
  } catch (error) {
    console.error('Error getting scheduled themes:', error);
    res.status(500).json({ error: 'Error getting scheduled themes' });
  }
});

app.delete('/admin/scheduled-themes/:id', verifyJWT, isAdmin, async (req, res) => {
  const scheduleId = req.params.id;
  
  try {
    console.log(`Attempting to delete scheduled theme with ID: ${scheduleId}`);
    
    const getQuery = `SELECT scheduled_date FROM scheduled_themes WHERE id = $1`;
    const getResult = await pool.query(getQuery, [scheduleId]);
    
    if (getResult.rows.length === 0) {
      console.log(`No scheduled theme found with ID: ${scheduleId}`);
      return res.status(404).json({ error: 'Scheduled theme not found' });
    }
    
    const scheduledDate = getResult.rows[0].scheduled_date;
    console.log(`Found scheduled theme for date: ${scheduledDate}`);
    
    const deleteQuery = `DELETE FROM scheduled_themes WHERE id = $1 RETURNING id`;
    const deleteResult = await pool.query(deleteQuery, [scheduleId]);
    
    if (deleteResult.rows.length === 0) {
      console.log(`Failed to delete theme with ID: ${scheduleId}`);
      return res.status(404).json({ error: 'Failed to delete scheduled theme' });
    }
    
    console.log(`Successfully deleted scheduled theme with ID: ${scheduleId}`);
    
    const today = new Date().toISOString().split('T')[0];
    if (scheduledDate === today) {
      await themeService.updateCurrentTheme();
    }
    
    res.json({
      success: true,
      message: `Scheduled theme deleted`
    });
  } catch (error) {
    console.error('Error deleting scheduled theme:', error);
    res.status(500).json({ error: 'Error deleting scheduled theme' });
  }
});

app.post('/admin/activate-theme/:themeId', verifyJWT, isAdmin, async (req, res) => {
  const themeId = parseInt(req.params.themeId);
  
  if (isNaN(themeId)) {
    return res.status(400).json({ error: 'Invalid theme ID' });
  }
  
  try {
    const success = await themeService.manuallyActivateTheme(themeId);
    
    if (success) {
      res.json({ 
        success: true, 
        message: `Theme ${themeId} has been manually activated for today`
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to activate theme' 
      });
    }
  } catch (error) {
    console.error('Error activating theme:', error);
    res.status(500).json({ 
      error: 'Error activating theme'
    });
  }
});

app.delete('/delete-account', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Start a database transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Delete user's comments
      await client.query('DELETE FROM comments WHERE user_id = $1', [userId]);
      
      // 2. Delete user's likes
      await client.query('DELETE FROM likes WHERE user_id = $1', [userId]);
      
      // 3. Delete user's friend relationships (both directions)
      await client.query('DELETE FROM friends WHERE user_id = $1 OR friend_id = $1', [userId]);
      
      // 4. Delete user's top tracks
      await client.query('DELETE FROM user_top_tracks WHERE user_id = $1', [userId]);
      
      // 5. Delete user's device tokens
      await client.query('DELETE FROM user_devices WHERE user_id = $1', [userId]);
      
      // 6. Delete user's notification settings
      await client.query('DELETE FROM user_notification_settings WHERE user_id = $1', [userId]);
      
      // 7. Delete user's posts (this will also delete associated likes and comments via cascade)
      await client.query('DELETE FROM daily_posts WHERE user_id = $1', [userId]);
      
      // 8. Finally, delete the user
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      
      await client.query('COMMIT');
      
      // Return success response
      res.status(200).json({ message: 'Account deleted successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});
  

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);

});
