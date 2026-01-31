// api/check-status.js - SIMPLE VERSION
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { payment_id } = req.query;
  
  console.log('🔍 Check status for:', payment_id);
  
  if (!payment_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing payment_id'
    });
  }
  
  // Always return success for testing
  const response = {
    success: true,
    orderId: payment_id,
    status: 'PAID', // Always return PAID for testing
    amount: 500,
    volume: 250,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    simulated: true,
    message: 'Payment successful (Simulated)',
    cors: true,
    timestamp: new Date().toISOString()
  };
  
  return res.status(200).json(response);
}
