// api/_middleware.js - GLOBAL CORS MIDDLEWARE
export default function middleware(req, res) {
  // Debug log
  console.log(`🌐 ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  
  // Allow all origins for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Or for production, allow specific origins:
  /*
  const allowedOrigins = [
    'https://water-station-zubair.web.app',
    'https://water-station-zubair.firebaseapp.com',
    'http://localhost:5000',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  */
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-callback-token, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS Preflight handled successfully');
    return res.status(200).json({
      success: true,
      message: 'CORS preflight OK',
      cors: true,
      timestamp: new Date().toISOString()
    });
  }
  
  // Continue to the actual handler
  return;
}
