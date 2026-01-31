// api/index.js
export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://water-station-zubair.web.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only GET for root
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  res.status(200).json({
    success: true,
    message: "🚰 Water Station Backend API is Running",
    version: "2.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      create_payment: "POST /api/create-payment",
      webhook: "POST /api/webhook",
      check_status: "GET /api/check-status"
    },
    cors_enabled: true
  });
}
