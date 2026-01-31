// api/check-status.js - CHECK PAYMENT STATUS
import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    // Apply CORS middleware
    const middleware = require('./_middleware.js').default || (() => {});
    middleware(req, res);
    
    console.log('🔍 Check Status Request:', {
      method: req.method,
      query: req.query,
      origin: req.headers.origin
    });
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Only GET allowed
    if (req.method !== 'GET') {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed. Use GET.' 
      });
    }
    
    const { payment_id } = req.query;
    
    if (!payment_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment_id parameter',
        example: '/api/check-status?payment_id=ORDER-12345'
      });
    }
    
    console.log('📊 Checking status for:', payment_id);
    
    // ========== 1. CHECK FIREBASE ==========
    let transactionData = null;
    let firebaseError = null;
    
    try {
      const firebaseUrl = `https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/${payment_id}.json`;
      const response = await fetch(firebaseUrl);
      
      if (response.ok) {
        transactionData = await response.json();
      } else {
        firebaseError = `Firebase error: ${response.status}`;
      }
    } catch (error) {
      firebaseError = error.message;
      console.warn('⚠️ Firebase check error:', error.message);
    }
    
    // ========== 2. CHECK ESP32 STATUS ==========
    let esp32Status = null;
    let deviceData = null;
    
    try {
      const deviceUrl = 'https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/devices/WS-001.json';
      const deviceResponse = await fetch(deviceUrl);
      
      if (deviceResponse.ok) {
        deviceData = await deviceResponse.json();
        
        if (deviceData) {
          esp32Status = {
            currentOrder: deviceData.currentOrder || null,
            fillProgress: deviceData.fillProgress || 0,
            relayActive: deviceData.relayActive || false,
            status: deviceData.status || 'unknown',
            lastHeartbeat: deviceData.lastHeartbeat || null
          };
        }
      }
    } catch (deviceError) {
      console.warn('⚠️ Device check error:', deviceError.message);
    }
    
    // ========== 3. PREPARE RESPONSE ==========
    const status = transactionData?.paymentStatus || 'NOT_FOUND';
    const simulated = transactionData?.simulated || false;
    
    const response = {
      success: true,
      orderId: payment_id,
      status: status,
      amount: transactionData?.amount || 0,
      volume: transactionData?.volume || 0,
      createdAt: transactionData?.createdAt || Date.now(),
      updatedAt: transactionData?.updatedAt || Date.now(),
      simulated: simulated,
      esp32: esp32Status,
      device_connected: !!deviceData,
      firebase_error: firebaseError,
      message: getStatusMessage(status),
      cors: true,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Status check complete:', { 
      orderId: payment_id, 
      status: status,
      simulated: simulated 
    });
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Check status error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error checking status',
      cors: true,
      timestamp: new Date().toISOString()
    });
  }
}

function getStatusMessage(status) {
  const messages = {
    'PENDING': 'Menunggu pembayaran',
    'PAID': 'Pembayaran diterima',
    'SUCCEEDED': 'Pembayaran berhasil',
    'PROCESSING': 'Sedang diproses',
    'COMPLETED': 'Selesai',
    'EXPIRED': 'Pembayaran kadaluarsa',
    'FAILED': 'Pembayaran gagal',
    'NOT_FOUND': 'Transaksi tidak ditemukan'
  };
  
  return messages[status] || status;
}
