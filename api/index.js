// api/index.js - SIMPLE VERSION
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS preflight handled');
    return res.status(200).end();
  }
  
  // Only GET for root
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log('Root endpoint accessed');
  
  // Simple response
  return res.status(200).json({
    success: true,
    message: "✅ Water Station Backend API is Running",
    timestamp: new Date().toISOString(),
    version: "2.0",
    cors: true
  });
}
