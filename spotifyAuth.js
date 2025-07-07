//spotifyAuth.js

const querystring = require('querystring');
const axios = require('axios');
require('dotenv').config();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

const getSpotifyAuthUrl = () => {
    const scope = 'user-read-private user-read-email user-read-recently-played user-top-read';
    const state = Math.random().toString(36).substring(7);
    
    return 'https://accounts.spotify.com/authorize?' + 
        querystring.stringify({
            response_type: 'code',
            client_id: clientId,
            scope: scope,
            redirect_uri: redirectUri,
            state: state,
            show_dialog: true 
        });
};

const getSpotifyTokens = async (code) => {
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            querystring.stringify({
                code: code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }), 
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Token exchange error:', error.response?.data || error.message);
        throw error;
    }
};

const refreshSpotifyToken = async (refreshToken) => {
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const axios = require('axios');
    const querystring = require('querystring');
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
    try {
      const response = await axios.post(
        tokenUrl,
        querystring.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            Authorization:
              'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      return response.data; 
    } catch (error) {
      console.error('Error refreshing Spotify token:', error.response?.data || error.message);
      throw error;
    }
  };
  
  module.exports = { getSpotifyAuthUrl, getSpotifyTokens, refreshSpotifyToken };
  