/**
 * Vercel Serverless Function - GitHub OAuth Token Exchange
 *
 * This function acts as a proxy to exchange OAuth authorization codes
 * for access tokens, keeping the client secret secure on the server.
 *
 * Deploy to Vercel:
 *   1. Create a Vercel account at https://vercel.com
 *   2. Install Vercel CLI: npm install -g vercel
 *   3. Deploy: vercel deploy
 *   4. Set environment variable: vercel env add GITHUB_CLIENT_SECRET
 *
 * Environment Variables Required:
 *   - GITHUB_CLIENT_SECRET: Your GitHub OAuth app client secret
 */

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            message: 'Only POST requests are accepted'
        });
    }

    try {
        const { code, client_id, redirect_uri } = req.body;

        // Validate required parameters
        if (!code) {
            return res.status(400).json({
                error: 'missing_code',
                message: 'Authorization code is required'
            });
        }

        if (!client_id) {
            return res.status(400).json({
                error: 'missing_client_id',
                message: 'Client ID is required'
            });
        }

        // Get client secret from environment
        const client_secret = process.env.GITHUB_CLIENT_SECRET;

        if (!client_secret) {
            console.error('GITHUB_CLIENT_SECRET environment variable not set');
            return res.status(500).json({
                error: 'server_configuration_error',
                message: 'Server is not properly configured'
            });
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id,
                client_secret,
                code,
                redirect_uri
            })
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('GitHub token exchange failed:', errorText);
            return res.status(tokenResponse.status).json({
                error: 'token_exchange_failed',
                message: 'Failed to exchange code for token'
            });
        }

        const tokenData = await tokenResponse.json();

        // Check for errors in GitHub response
        if (tokenData.error) {
            return res.status(400).json({
                error: tokenData.error,
                message: tokenData.error_description || 'GitHub OAuth error'
            });
        }

        // Return access token to client
        return res.status(200).json({
            access_token: tokenData.access_token,
            token_type: tokenData.token_type,
            scope: tokenData.scope
        });

    } catch (error) {
        console.error('OAuth proxy error:', error);
        return res.status(500).json({
            error: 'internal_server_error',
            message: 'An unexpected error occurred'
        });
    }
}
