// api/webhook.js - FIXED VERSION
export default async function handler(req, res) {
  // 1. Validasi method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // 2. Validasi Xendit Callback Token
  const callbackToken = process.env.XENDIT_CALLBACK_TOKEN;
  const incomingToken = req.headers['x-callback-token'];
  
  if (!callbackToken || incomingToken !== callbackToken) {
    console.log('Invalid webhook token');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const webhookData = req.body;
    const { external_id, status } = webhookData;
    
    console.log(`📬 Webhook received: ${external_id} - ${status}`);
    
    // 3. Update Firebase transaction status
    const firebaseUrl = `https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/${external_id}.json`;
    
    await fetch(firebaseUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentStatus: status,
        updatedAt: Date.now()
      })
    });
    
    console.log(`✅ Firebase updated for: ${external_id}`);
    
    // 4. Jika pembayaran sukses, kirim command ke ESP32
    if (status === 'PAID' || status === 'SETTLED') {
      const transactionRes = await fetch(firebaseUrl);
      const transactionData = await transactionRes.json();
      
      if (transactionData) {
        const commandUrl = 'https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/devices/WS-001/command.json';
        
        await fetch(commandUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: external_id,
            status: "pending",
            type: "fill_water",
            volume: transactionData.volume || 1, // default 1 liter
            amount: transactionData.amount,
            timestamp: Date.now()
          })
        });
        
        console.log(`🚰 Command sent to ESP32 for order: ${external_id}`);
      }
    }
    
    // 5. Always return 200 to Xendit
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });
    
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    
    // Tetap return 200 ke Xendit (important!)
    res.status(200).json({ 
      success: false, 
      error: error.message,
      note: 'Error logged but Xendit notified of receipt'
    });
  }
}
