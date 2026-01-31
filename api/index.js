// api/index.js - ROOT API ENDPOINT
export default function handler(req, res) {
  // Apply CORS middleware
  const middleware = require('./_middleware.js').default || (() => {});
  middleware(req, res);
  
  // Only GET for root
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use GET.' 
    });
  }
  
  console.log('🔧 Root endpoint accessed');
  
  res.status(200).json({
    success: true,
    message: "🚰 Water Station Backend API v2.0",
    version: "2.0.1",
    timestamp: new Date().toISOString(),
    status: "operational",
    cors_enabled: true,
    endpoints: {
      create_payment: {
        method: "POST",
        path: "/api/create-payment",
        description: "Create Xendit payment invoice",
        body: {
          external_id: "string (required)",
          amount: "number (required)",
          payer_email: "string (optional)",
          description: "string (optional)",
          volume: "number (optional)"
        }
      },
      check_status: {
        method: "GET", 
        path: "/api/check-status?payment_id={id}",
        description: "Check payment status"
      },
      webhook: {
        method: "POST",
        path: "/api/webhook",
        description: "Xendit webhook receiver"
      }
    },
    frontend: "https://water-station-zubair.web.app",
    documentation: "Check README.md for details",
    support: "For issues, check the GitHub repository"
  });
}
