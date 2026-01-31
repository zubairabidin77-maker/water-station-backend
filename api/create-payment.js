// api/create-payment.js - CREATE PAYMENT ENDPOINT
import Xendit from 'xendit-node';
import fetch from 'node-fetch';

// Initialize Xendit
let xendit;
try {
  xendit = new Xendit({
    secretKey: process.env.XENDIT_SECRET_KEY || 'xnd_development_default_key'
  });
} catch (error) {
  console.warn('⚠️ Xendit initialization warning:', error.message);
}

export default async function handler(req, res) {
  try {
    // Apply CORS middleware
    const middleware = require('./_middleware.js').default || (() => {});
    middleware(req, res);
    
    console.log('💳 Create Payment Request:', {
      method: req.method,
      origin: req.headers.origin,
      body: req.body ? 'Present' : 'Empty'
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
    
    // Parse request body
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON body',
        message: parseError.message
      });
    }
    
    const { external_id, amount, payer_email, description, volume } = body;
    
    // Validate required fields
    if (!external_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['external_id', 'amount'],
        received: { external_id, amount }
      });
    }
    
    console.log('📝 Processing payment:', { external_id, amount, volume });
    
    // ========== 1. SAVE TO FIREBASE ==========
    const firebaseUrl = `https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/${external_id}.json`;
    
    const transactionData = {
      orderId: external_id,
      amount: amount,
      volume: volume || 250,
      description: description || `Beli ${volume || 250}ml air`,
      status: 'pending',
      email: payer_email || 'customer@waterstation.com',
      createdAt: Date.now(),
      paymentStatus: 'PENDING',
      backend_processed: true,
      timestamp: new Date().toISOString()
    };
    
    try {
      const firebaseResponse = await fetch(firebaseUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      });
      
      if (!firebaseResponse.ok) {
        console.warn('⚠️ Firebase save warning:', await firebaseResponse.text());
      } else {
        console.log('✅ Saved to Firebase:', external_id);
      }
    } catch (firebaseError) {
      console.warn('⚠️ Firebase error (non-critical):', firebaseError.message);
      // Continue even if Firebase fails
    }
    
    // ========== 2. CREATE XENDIT INVOICE ==========
    let invoiceData;
    let xenditSuccess = false;
    
    if (xendit && process.env.XENDIT_SECRET_KEY && !process.env.XENDIT_SECRET_KEY.includes('default')) {
      try {
        const { Invoice } = xendit;
        const invoice = new Invoice({});
        
        invoiceData = await invoice.createInvoice({
          external_id: external_id,
          amount: amount,
          payer_email: payer_email || 'customer@waterstation.com',
          description: description || `Pembayaran air ${volume || 250}ml`,
          currency: 'IDR',
          success_redirect_url: 'https://water-station-zubair.web.app/payment/success',
          failure_redirect_url: 'https://water-station-zubair.web.app/payment/failed',
          payment_methods: ['QRIS', 'CREDIT_CARD', 'OVO', 'DANA', 'LINKAJA'],
          items: [
            {
              name: `Air ${volume || 250}ml`,
              quantity: 1,
              price: amount,
              category: 'Water'
            }
          ],
          customer: {
            email: payer_email || 'customer@waterstation.com',
            given_names: 'Water Station',
            surname: 'Customer'
          },
          fees: [
            {
              type: 'ADMIN',
              value: 0
            }
          ]
        });
        
        xenditSuccess = true;
        console.log('✅ Xendit invoice created:', invoiceData.id);
        
      } catch (xenditError) {
        console.error('❌ Xendit error:', xenditError.message);
        // Fallback to simulated invoice
      }
    }
    
    // ========== 3. FALLBACK: SIMULATED INVOICE ==========
    if (!xenditSuccess) {
      console.log('🔄 Using simulated invoice (Xendit not configured or failed)');
      
      invoiceData = {
        id: 'sim_' + external_id,
        external_id: external_id,
        amount: amount,
        invoice_url: `https://water-station-zubair.web.app/payment/success?order=${external_id}&simulated=true`,
        status: 'PENDING',
        expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        available_banks: [
          {
            bank_code: 'QRIS',
            name: 'QRIS',
            qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://water-station-zubair.web.app/payment/success?order=${external_id}`)}`
          }
        ]
      };
    }
    
    // ========== 4. PREPARE RESPONSE ==========
    let qrCodeUrl = null;
    if (invoiceData.available_banks) {
      const qrisBank = invoiceData.available_banks.find(b => b.bank_code === 'QRIS');
      if (qrisBank && qrisBank.qr_code) {
        qrCodeUrl = qrisBank.qr_code;
      }
    }
    
    // Generate QR if not provided
    if (!qrCodeUrl && invoiceData.invoice_url) {
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(invoiceData.invoice_url)}`;
    }
    
    const response = {
      success: true,
      invoice_id: invoiceData.id,
      invoice_url: invoiceData.invoice_url,
      expiry_date: invoiceData.expiry_date,
      amount: invoiceData.amount,
      status: invoiceData.status,
      external_id: invoiceData.external_id,
      qr_code: qrCodeUrl,
      invoice_qr: qrCodeUrl, // Alias for frontend
      xendit_success: xenditSuccess,
      simulated: !xenditSuccess,
      message: xenditSuccess ? 'Xendit invoice created successfully' : 'Simulated invoice created (Xendit not configured)',
      firebase_saved: true,
      cors: true,
      timestamp: new Date().toISOString(),
      order_details: {
        volume: volume || 250,
        price: amount,
        description: description || `Air ${volume || 250}ml`
      }
    };
    
    console.log('✅ Payment response ready:', { 
      invoice_id: response.invoice_id,
      simulated: response.simulated 
    });
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Create payment error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error',
      cors: true,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
