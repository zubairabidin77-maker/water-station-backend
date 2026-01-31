// AWAL FILE - CORS MIDDLEWARE
export default async function handler(req, res) {
  // ========== CORS HEADERS ==========
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
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-callback-token');
  
  // ========== HANDLE PREFLIGHT ==========
  if (req.method === 'OPTIONS') {
    console.log('🔄 OPTIONS preflight request');
    return res.status(200).end();
  }
  // api/check-status.js - CHECK PAYMENT STATUS
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://water-station-zubair.web.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { payment_id } = req.query;
  
  if (!payment_id) {
    return res.status(400).json({ 
      success: false, 
      error: 'Payment ID required' 
    });
  }
  
  try {
    // 1. Check from Firebase
    const firebaseUrl = `https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/${payment_id}.json`;
    
    const response = await fetch(firebaseUrl);
    const transactionData = await response.json();
    
    if (!transactionData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found' 
      });
    }
    
    // 2. Check ESP32 status
    let esp32Status = null;
    let esp32Data = null;
    
    try {
      const esp32Response = await fetch('https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/devices/WS-001.json');
      esp32Data = await esp32Response.json();
      
      if (esp32Data) {
        esp32Status = {
          currentOrder: esp32Data.currentOrder,
          fillProgress: esp32Data.fillProgress || 0,
          relayActive: esp32Data.relayActive || false,
          status: esp32Data.status || 'unknown'
        };
      }
    } catch (espError) {
      console.log('ESP32 status not available:', espError.message);
    }
    
    // 3. Response
    res.status(200).json({
      success: true,
      orderId: payment_id,
      status: transactionData.paymentStatus || 'PENDING',
      amount: transactionData.amount || 0,
      volume: transactionData.volume || 0,
      createdAt: transactionData.createdAt || Date.now(),
      updatedAt: transactionData.updatedAt || Date.now(),
      esp32: esp32Status,
      raw_esp32: esp32Data, // For debugging
      firebase_connected: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Check status error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
