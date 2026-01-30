// api/check-status.js - FIXED
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { orderId } = req.query;
  
  if (!orderId) {
    return res.status(400).json({ error: 'orderId required' });
  }
  
  try {
    const firebaseUrl = 'https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/' + orderId + '.json';
    const response = await fetch(firebaseUrl);
    const data = await response.json();
    
    if (!data) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.status(200).json({
      success: true,
      orderId,
      status: data.paymentStatus || 'PENDING',
      amount: data.amount,
      volume: data.volume,
      invoiceUrl: data.invoiceUrl
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }

}
