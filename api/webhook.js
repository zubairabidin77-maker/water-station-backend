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
    console.log('❌ Invalid webhook token');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const webhookData = req.body;
    console.log('📬 Webhook data:', JSON.stringify(webhookData, null, 2));
    
    // 3. Extract data berdasarkan struktur Xendit
    let external_id, status;
    
    // Struktur berbeda-beda tergantung event type
    if (webhookData.external_id) {
      // Untuk payment.paid, payment.expired
      external_id = webhookData.external_id;
      status = webhookData.status;
    } else if (webhookData.data && webhookData.data.external_id) {
      // Untuk struktur nested
      external_id = webhookData.data.external_id;
      status = webhookData.data.status || webhookData.status;
    } else if (webhookData.id) {
      // Alternatif: gunang id sebagai external_id
      external_id = webhookData.id;
      status = webhookData.status;
    }
    
    if (!external_id) {
      console.log('⚠️ No external_id found in webhook:', webhookData);
      return res.status(200).json({ received: true, note: 'No external_id' });
    }
    
    console.log(`📬 Webhook: ${external_id} - ${status}`);
    
    // 4. Update Firebase transaction status
    const firebaseUrl = `https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/${external_id}.json`;
    
    await fetch(firebaseUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentStatus: status,
        updatedAt: Date.now(),
        webhookReceived: true
      })
    });
    
    console.log(`✅ Firebase updated for: ${external_id}`);
    
    // 5. Jika pembayaran sukses, kirim command ke ESP32
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
            volume: transactionData.volume || 1,
            amount: transactionData.amount,
            timestamp: Date.now()
          })
        });
        
        console.log(`🚰 Command sent to ESP32 for order: ${external_id}`);
      }
    }
    
    // 6. Response ke Xendit
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed',
      external_id: external_id
    });
    
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    
    res.status(200).json({ 
      success: false, 
      error: error.message
    });
  }
}
