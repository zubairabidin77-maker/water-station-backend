// api/create-payment.js - CREATE XENDIT PAYMENT
import Xendit from 'xendit-node';

const xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY
});
const { Invoice } = xendit;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://water-station-zubair.web.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { external_id, amount, payer_email, description, volume } = req.body;
    
    // Validation
    if (!external_id || !amount || !volume) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: external_id, amount, volume' 
      });
    }
    
    console.log('Creating payment for:', { external_id, amount, volume });
    
    // 1. Save to Firebase first
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
    
    await fetch(firebaseUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactionData)
    });
    
    console.log('Saved to Firebase:', external_id);
    
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
      },
      fees: [
        {
          type: 'ADMIN',
          value: 0
        }
      ]
    };
    
    console.log('Creating Xendit invoice:', invoiceData);
    const createdInvoice = await invoice.createInvoice(invoiceData);
    console.log('Xendit response:', createdInvoice.id);
    
    // 3. Response with all needed data
    res.status(200).json({
      success: true,
      invoice_id: createdInvoice.id,
      invoice_url: createdInvoice.invoice_url,
      expiry_date: createdInvoice.expiry_date,
      amount: createdInvoice.amount,
      status: createdInvoice.status,
      external_id: createdInvoice.external_id,
      // QR code from Xendit (if available)
      qr_code: createdInvoice.available_banks?.find(b => b.bank_code === 'QRIS')?.qr_code || null,
      // Alternative: generate QR from invoice_url
      invoice_qr: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(createdInvoice.invoice_url)}`,
      message: 'Invoice created successfully',
      firebase_updated: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Create payment error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create payment',
      timestamp: new Date().toISOString()
    });
  }
}
