// api/webhook.js - XENDIT WEBHOOK HANDLER
import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    // Apply CORS middleware
    const middleware = require('./_middleware.js').default || (() => {});
    middleware(req, res);
    
    console.log('📨 Webhook Request:', {
      method: req.method,
      origin: req.headers.origin,
      headers: req.headers
    });
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Only POST allowed
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed. Use POST.' 
      });
    }
    
    // ========== 1. VERIFY WEBHOOK TOKEN ==========
    const callbackToken = process.env.XENDIT_CALLBACK_TOKEN;
    const incomingToken = req.headers['x-callback-token'];
    
    if (callbackToken && incomingToken !== callbackToken) {
      console.warn('⚠️ Invalid webhook token');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid callback token'
      });
    }
    
    // ========== 2. PARSE WEBHOOK DATA ==========
    let webhookData;
    try {
      webhookData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log('📩 Webhook data received:', {
        event: webhookData.event,
        data: webhookData.data ? 'Present' : 'Missing'
      });
    } catch (parseError) {
      console.error('❌ Webhook parse error:', parseError);
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON body',
        message: parseError.message
      });
    }
    
    // ========== 3. EXTRACT ORDER ID ==========
    let orderId = null;
    let status = null;
    let amount = null;
    
    if (webhookData.data) {
      orderId = webhookData.data.reference_id || 
                webhookData.data.external_id || 
                webhookData.data.id;
      
      status = webhookData.data.status || 
               webhookData.status;
      
      amount = webhookData.data.amount || 
               webhookData.data.request_amount;
    }
    
    // If no orderId found, maybe this is a test webhook
    if (!orderId) {
      console.log('ℹ️ Webhook without orderId (possibly test)');
      return res.status(200).json({
        success: true,
        message: 'Webhook received (test or non-transaction event)',
        event: webhookData.event,
        processed: false,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('🔍 Extracted from webhook:', { orderId, status, amount });
    
    // ========== 4. UPDATE FIREBASE ==========
    try {
      const firebaseUrl = `https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/${orderId}.json`;
      
      const updateData = {
        paymentStatus: status || 'UNKNOWN',
        webhookEvent: webhookData.event,
        webhookData: webhookData.data,
        updatedAt: Date.now(),
        webhookReceived: true,
        webhookTimestamp: new Date().toISOString()
      };
      
      await fetch(firebaseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      console.log('✅ Firebase updated for:', orderId);
      
      // ========== 5. SEND COMMAND TO ESP32 IF PAYMENT SUCCESSFUL ==========
      const successStatuses = ['PAID', 'SETTLED', 'SUCCEEDED', 'COMPLETED'];
      
      if (successStatuses.includes(status)) {
        // Get transaction details first
        const transactionUrl = `https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/${orderId}.json`;
        const transactionRes = await fetch(transactionUrl);
        const transaction = await transactionRes.json();
        
        if (transaction) {
          // Send command to ESP32
          const commandUrl = 'https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/devices/WS-001/command.json';
          
          const commandData = {
            orderId: orderId,
            type: 'fill_water',
            volume: transaction.volume || 250,
            amount: transaction.amount || amount,
            timestamp: Date.now(),
            deviceId: 'WS-001',
            status: 'pending',
            webhook_triggered: true
          };
          
          await fetch(commandUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commandData)
          });
          
          console.log('🚰 Command sent to ESP32 for order:', orderId);
          
          // Also save to commands log
          const commandLogUrl = `https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/commands/${orderId}.json`;
          await fetch(commandLogUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...commandData,
              sentAt: new Date().toISOString()
            })
          });
        }
      }
      
    } catch (firebaseError) {
      console.error('❌ Firebase update error:', firebaseError.message);
      // Continue - don't fail the webhook
    }
    
    // ========== 6. RESPONSE TO XENDIT ==========
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      orderId: orderId,
      status: status,
      event: webhookData.event,
      processed: true,
      timestamp: new Date().toISOString(),
      cors: true
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    // Still return 200 to Xendit (important!)
    return res.status(200).json({
      success: false,
      error: error.message,
      message: 'Error logged but Xendit notified',
      timestamp: new Date().toISOString(),
      cors: true
    });
  }
}
