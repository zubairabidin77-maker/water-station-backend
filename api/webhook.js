// api/webhook.js - FINAL FIXED VERSION
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
    console.log('📬 Webhook event:', webhookData.event);
    
    // 3. Extract data berdasarkan event type
    let orderId, status, amount;
    const event = webhookData.event;
    
    if (webhookData.data) {
      // Ambil dari data.reference_id (ini yang kita set sebagai external_id)
      orderId = webhookData.data.reference_id;
      status = webhookData.data.status;
      amount = webhookData.data.amount || webhookData.data.request_amount;
      
      // Fallback: jika tidak ada reference_id, coba payment_request_id
      if (!orderId && webhookData.data.payment_request_id) {
        orderId = webhookData.data.payment_request_id;
      }
    }
    
    // Log untuk debugging
    console.log('🔍 Extracted data:', { orderId, status, amount, event });
    
    if (!orderId) {
      console.log('⚠️ No orderId found, but webhook received:', event);
      return res.status(200).json({ 
        received: true, 
        event: event,
        note: 'No orderId found for this event type' 
      });
    }
    
    console.log(`📬 Processing: ${orderId} - ${status} (${event})`);
    
    // 4. Update Firebase transaction status
    const firebaseUrl = `https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/${orderId}.json`;
    
    await fetch(firebaseUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentStatus: status,
        event: event,
        amount: amount,
        updatedAt: Date.now(),
        webhookReceived: true
      })
    });
    
    console.log(`✅ Firebase updated for: ${orderId}`);
    
    // 5. Jika pembayaran sukses, kirim command ke ESP32
    const successStatuses = ['PAID', 'SETTLED', 'SUCCEEDED', 'COMPLETED'];
    if (successStatuses.includes(status)) {
      const transactionRes = await fetch(firebaseUrl);
      const transactionData = await transactionRes.json();
      
      if (transactionData) {
        const commandUrl = 'https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/devices/WS-001/command.json';
        
        await fetch(commandUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderId,
            status: "pending",
            type: "fill_water",
            volume: transactionData.volume || 1,
            amount: transactionData.amount || amount,
            timestamp: Date.now()
          })
        });
        
        console.log(`🚰 Command sent to ESP32 for order: ${orderId}`);
      }
    }
    
    // 6. Response ke Xendit
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      orderId: orderId,
      status: status,
      event: event
    });
    
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    
    res.status(200).json({ 
      success: false, 
      error: error.message,
      note: 'Error logged but Xendit notified'
    });
  }
}
