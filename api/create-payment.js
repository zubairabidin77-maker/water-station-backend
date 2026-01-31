// api/create-payment.js - SIMPLE WORKING VERSION
export default async function handler(req, res) {
  // ========== CORS HEADERS ==========
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // ========== HANDLE OPTIONS ==========
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS preflight for create-payment');
    return res.status(200).json({
      success: true,
      message: 'CORS preflight OK'
    });
  }
  
  // ========== MAIN LOGIC ==========
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    // Parse body
    let body;
    try {
      body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON'
      });
    }
    
    const { external_id, amount, volume } = body;
    
    console.log('📝 Payment request:', { external_id, amount, volume });
    
    // Simple validation
    if (!external_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing external_id or amount'
      });
    }
    
    // Simulate response (ALWAYS WORKING)
    const response = {
      success: true,
      invoice_id: 'inv_' + external_id,
      invoice_url: `https://checkout.xendit.co/simulated/${external_id}`,
      amount: amount,
      status: 'PENDING',
      external_id: external_id,
      invoice_qr: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://water-station-zubair.web.app/payment?order=${external_id}`)}`,
      message: 'Payment invoice created (Simulated)',
      simulated: true,
      cors: true,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Payment response ready');
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Server error',
      cors: true
    });
  }
}
