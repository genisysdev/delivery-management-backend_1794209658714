import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
 
dotenv.config();
const router = express.Router();
 
router.get('/embed-config', async (req, res) => {
  try {
    const {
      TENANT_ID,
      CLIENT_ID,
      CLIENT_SECRET,
      POWER_BI_USERNAME,
      POWER_BI_PASSWORD,
      WORKSPACE_ID,
      REPORT_ID,
    } = process.env;
 
    // 1. Get Azure AD Token (OAuth2)
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/token`,
      new URLSearchParams({
        grant_type: 'password',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        username: POWER_BI_USERNAME,
        password: POWER_BI_PASSWORD,
        resource: 'https://analysis.windows.net/powerbi/api',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log('🔵 Azure Access Token:', tokenResponse);
 
    const azureAccessToken = tokenResponse.data.access_token;
 
    // 2. Generate Power BI Embed Token
    const embedTokenResponse = await axios.post(
      `https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/reports/${REPORT_ID}/GenerateToken`,
      {
        accessLevel: 'View', // Optional: "edit", "create", etc.
      },
      {
        headers: {
          Authorization: `Bearer ${azureAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
 
    // 3. Return embed details
    const embedToken = embedTokenResponse.data.token;
    const embedUrl = `https://app.powerbi.com/reportEmbed?reportId=${REPORT_ID}&groupId=${WORKSPACE_ID}`;
 
    return res.json({
      embedUrl,
      reportId: REPORT_ID,
      token: embedToken,
    });
 } catch (error) {
  console.error('🔴 Power BI Embed Error:', error?.response?.data || error.message || error);
  return res.status(500).json({
    error: 'Failed to generate Power BI embed configuration',
    details: error?.response?.data || error.message || error
  });
}
 
});
 
export default router;