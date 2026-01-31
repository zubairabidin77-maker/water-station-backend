// api/index.js - LANDING PAGE API
export default function handler(req, res) {
  // CORS headers untuk frontend
  res.setHeader('Access-Control-Allow-Origin', 'https://water-station-zubair.web.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  res.status(200).json({
    success: true,
    message: "🚰 Water Station Backend API is Running",
    version: "2.0",
    timestamp: new Date().toISOString(),
    endpoints: [
      {
        method: "POST",
        path: "/api/create-payment",
        description: "Create Xendit payment invoice"
      },
      {
        method: "POST", 
        path: "/api/webhook",
        description: "Xendit webhook receiver"
      },
      {
        method: "GET",
        path: "/api/check-status",
        description: "Check payment status"
      }
    ],
    frontend_url: "https://water-station-zubair.web.app",
    cors_enabled: true
  });
}
