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
  // api/webhook.js - FINAL WORKING VERSION
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
  
  // 3. Set CORS headers untuk frontend
  res.setHeader('Access-Control-Allow-Origin', 'https://water-station-zubair.web.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-callback-token');
  
  // Handle OPTIONS request untuk CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const webhookData = req.body;
    console.log('📬 Webhook event received:', webhookData.event || 'unknown');
    
    // 4. Extract data berdasarkan event type
    let orderId, status, amount;
    const event = webhookData.event || 'unknown';
    
    if (webhookData.data) {
      // Ambil dari data.reference_id (ini yang kita set sebagai external_id di create-payment)
      orderId = webhookData.data.reference_id;
      status = webhookData.data.status;
      amount = webhookData.data.amount || webhookData.data.request_amount;
      
      // Fallback: jika tidak ada reference_id, coba payment_request_id
      if (!orderId && webhookData.data.payment_request_id) {
        orderId = webhookData.data.payment_request_id;
      }
      
      // Fallback: jika tidak ada payment_request_id, coba id
      if (!orderId && webhookData.data.id) {
        orderId = webhookData.data.id;
      }
    }
    
    // Log untuk debugging
    console.log('🔍 Extracted data:', { 
      orderId: orderId || 'NOT FOUND', 
      status: status || 'NOT FOUND', 
      amount: amount || 0, 
      event: event 
    });
    
    // 5. Jika tidak ada orderId, mungkin ini test webhook atau event lain
    if (!orderId) {
      console.log('⚠️ No orderId found for event:', event);
      return res.status(200).json({ 
        success: true, 
        received: true, 
        event: event,
        note: 'Webhook received but no orderId to process'
      });
    }
    
    console.log(`📬 Processing webhook: ${orderId} - ${status} (${event})`);
    
    // 6. Update Firebase transaction status
    const firebaseTransactionUrl = `https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/${orderId}.json`;
    
    const transactionUpdate = {
      paymentStatus: status,
      event: event,
      amount: amount || 0,
      updatedAt: Date.now(),
      webhookReceived: true,
      webhookTimestamp: new Date().toISOString()
    };
    
    try {
      await fetch(firebaseTransactionUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionUpdate)
      });
      
      console.log(`✅ Firebase transaction updated for: ${orderId}`);
      
      // 7. Jika pembayaran sukses, kirim command ke ESP32
      const successStatuses = ['PAID', 'SETTLED', 'SUCCEEDED', 'COMPLETED'];
      
      if (successStatuses.includes(status)) {
        // Ambil data transaksi lengkap
        const transactionRes = await fetch(firebaseTransactionUrl);
        const transactionData = await transactionRes.json();
        
        if (transactionData) {
          // Path untuk ESP32 (sesuai dengan code ESP32)
          const esp32CommandUrl = 'https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/devices/WS-001/command.json';
          
          const esp32Command = {
            orderId: orderId,
            type: "fill_water",
            volume: transactionData.volume || 1,  // default 1 liter
            amount: transactionData.amount || amount || 0,
            timestamp: Date.now(),
            deviceId: "WS-001",
            status: "pending",
            createdAt: new Date().toISOString(),
            // Tambahan untuk kompatibilitas
            currentOrder: orderId,
            fillProgress: 0,
            relayActive: false
          };
          
          await fetch(esp32CommandUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(esp32Command)
          });
          
          console.log(`🚰 Command sent to ESP32 for order: ${orderId}`);
          console.log(`📡 Command sent to: ${esp32CommandUrl}`);
          
          // Juga simpan di path commands untuk backup
          const backupCommandUrl = `https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/commands/${orderId}.json`;
          
          await fetch(backupCommandUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(esp32Command)
          });
          
          console.log(`📋 Backup command saved: ${backupCommandUrl}`);
        }
      }
      
      // 8. Jika status expired/failed, update saja
      const failedStatuses = ['EXPIRED', 'FAILED', 'CANCELLED'];
      if (failedStatuses.includes(status)) {
        console.log(`⚠️ Payment ${status.toLowerCase()} for order: ${orderId}`);
      }
      
    } catch (firebaseError) {
      console.error('❌ Firebase update error:', firebaseError);
      // Tetap lanjut, jangan gagalkan webhook
    }
    
    // 9. SELALU return 200 ke Xendit (penting!)
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      orderId: orderId,
      status: status,
      event: event,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    // Tetap return 200 ke Xendit meski ada error
    res.status(200).json({ 
      success: false, 
      error: error.message,
      note: 'Error logged but Xendit notified of receipt',
      timestamp: new Date().toISOString()
    });
  }
}
