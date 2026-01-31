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
  // api/create-payment.js - FIXED CORS VERSION
import Xendit from 'xendit-node';

const xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY
});
const { Invoice } = xendit;

export default async function handler(req, res) {
  // ==================== CORS HEADERS ====================
  // Allow specific origin
  const allowedOrigins = [
    'https://water-station-zubair.web.app',
    'https://water-station-zubair.firebaseapp.com',
    'http://localhost:5000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  // For development, you can use '*' but it's less secure
  // res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-callback-token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // ==================== HANDLE OPTIONS (PREFLIGHT) ====================
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request received');
    return res.status(200).end();
  }
  
  // ==================== MAIN REQUEST HANDLER ====================
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }
  
  try {
    const { external_id, amount, payer_email, description, volume } = req.body;
    
    // Log incoming request
    console.log('🔵 Create Payment Request:', {
      external_id,
      amount,
      volume,
      origin: req.headers.origin
    });
    
    // Validation
    if (!external_id || !amount || !volume) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: external_id, amount, volume' 
      });
    }
    
    // 1. Save to Firebase
    const firebaseUrl = `https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/${external_id}.json`;
    
    const transactionData = {
      orderId: external_id,
      amount: amount,
      volume: volume,
      description: description || `Beli ${volume}ml air`,
      status: 'pending',
      email: payer_email || 'customer@waterstation.com',
      createdAt: Date.now(),
      paymentStatus: 'PENDING',
      backend_received: true
    };
    
    const firebaseResponse = await fetch(firebaseUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactionData)
    });
    
    console.log('✅ Saved to Firebase:', external_id);
    
    // 2. Create Xendit Invoice
    const invoice = new Invoice({});
    
    const invoiceData = {
      external_id: external_id,
      amount: amount,
      payer_email: payer_email || 'customer@waterstation.com',
      description: description || `Pembayaran air ${volume}ml`,
      currency: 'IDR',
      success_redirect_url: 'https://water-station-zubair.web.app/payment/success',
      failure_redirect_url: 'https://water-station-zubair.web.app/payment/failed',
      // Add QRIS specifically
      payment_methods: ['QRIS', 'OVO', 'DANA', 'LINKAJA', 'CREDIT_CARD'],
      items: [
        {
          name: `Air ${volume}ml`,
          quantity: 1,
          price: amount,
          category: 'Water'
        }
      ],
      customer: {
        email: payer_email || 'customer@waterstation.com'
      }
    };
    
    console.log('🔄 Creating Xendit invoice...');
    const createdInvoice = await invoice.createInvoice(invoiceData);
    console.log('✅ Xendit invoice created:', createdInvoice.id);
    
    // 3. Parse QR code from response
    let qrCodeUrl = null;
    if (createdInvoice.available_banks) {
      const qrisBank = createdInvoice.available_banks.find(b => b.bank_code === 'QRIS');
      if (qrisBank && qrisBank.qr_code) {
        qrCodeUrl = qrisBank.qr_code;
      }
    }
    
    // Alternative: Generate QR from invoice URL
    const invoiceQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(createdInvoice.invoice_url)}`;
    
    // 4. Send success response
    return res.status(200).json({
      success: true,
      invoice_id: createdInvoice.id,
      invoice_url: createdInvoice.invoice_url,
      expiry_date: createdInvoice.expiry_date,
      amount: createdInvoice.amount,
      status: createdInvoice.status,
      external_id: createdInvoice.external_id,
      qr_code: qrCodeUrl,
      invoice_qr: invoiceQrUrl,
      message: 'Invoice created successfully',
      firebase_updated: true,
      timestamp: new Date().toISOString(),
      cors_allowed: true
    });
    
  } catch (error) {
    console.error('❌ Create payment error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create payment',
      timestamp: new Date().toISOString()
    });
  }
}
