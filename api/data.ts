import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory storage (will reset on serverless function restart)
// In production, you should use a database like Vercel KV, MongoDB, or Supabase
let dataStore: {
  categories?: any[];
  items?: any[];
  settings?: any;
  orders?: any[];
  lastUpdated?: string;
} = {};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Return stored data
    return res.status(200).json({
      success: true,
      data: dataStore,
      lastUpdated: dataStore.lastUpdated || null,
    });
  }

  if (req.method === 'POST') {
    try {
      const { categories, items, settings, orders } = req.body;

      // Validate required data
      if (!categories || !items || !settings) {
        return res.status(400).json({
          success: false,
          error: 'Missing required data: categories, items, or settings',
        });
      }

      // Update data store
      dataStore = {
        categories,
        items,
        settings,
        orders: orders || [],
        lastUpdated: new Date().toISOString(),
      };

      return res.status(200).json({
        success: true,
        message: 'Data saved successfully',
        lastUpdated: dataStore.lastUpdated,
      });
    } catch (error) {
      console.error('Error saving data:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save data',
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}
