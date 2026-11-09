import dotenv from 'dotenv';
import { ConfidentialClientApplication } from "@azure/msal-node";

const env = process.env.NODE_ENV || 'local';
dotenv.config({ path: `.env.${env}` });

const config = {
  auth: {
    clientId: process.env.CLIENT_ID, 
    authority: `${process.env.MICROSOFT_AUTHORITY}`,
    clientSecret: process.env.CLIENT_SECRET, 
  }
};

const msalClient = new ConfidentialClientApplication(config);

const getAccessToken = async () => {
  const tokenRequest = {
    scopes: [process.env.MICROSOFT_GRAPH_SCOPE],
  };
  try {
    const response = await msalClient.acquireTokenByClientCredential(tokenRequest);
    return response.accessToken;
  } catch (error) {
    console.error('Error acquiring token:', error);
    throw new Error('Failed to acquire access token');
  }
}

export default getAccessToken;