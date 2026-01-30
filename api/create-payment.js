// api/create-payment.js
import Xendit from 'xendit-node';

const xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY
});
const { Invoice } = xendit;

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://water-station-zubair.web.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { external_id, amount, payer_email, description, volume } = req.body;
    
    // 1. Validasi input
    if (!external_id || !amount || !volume) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    // 2. Simpan ke Firebase dulu
    const firebaseUrl = `https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/${external_id}.json`;
    
    const transactionData = {
      orderId: external_id,
      amount: amount,
      volume: volume,
      description: description || `Beli ${volume}ml air`,
      status: 'pending',
      email: payer_email,
      createdAt: Date.now(),
      paymentStatus: 'PENDING'
    };
    
    await fetch(firebaseUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactionData)
    });
    
    // 3. Buat invoice di Xendit
    const invoice = new Invoice({});
    
    const invoiceData = {
      external_id: external_id,
      amount: amount,
      payer_email: payer_email || 'customer@waterstation.com',
      description: description || `Pembayaran air ${volume}ml`,
      currency: 'IDR',
      success_redirect_url: 'https://water-station-zubair.web.app/success',
      failure_redirect_url: 'https://water-station-zubair.web.app/failed',
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
    
    const createdInvoice = await invoice.createInvoice(invoiceData);
    
    // 4. Response dengan data invoice
    res.status(200).json({
      success: true,
      invoice_id: createdInvoice.id,
      invoice_url: createdInvoice.invoice_url,
      expiry_date: createdInvoice.expiry_date,
      amount: createdInvoice.amount,
      status: createdInvoice.status,
      external_id: createdInvoice.external_id,
      // Untuk QRIS
      qr_code: createdInvoice.available_banks?.find(b => b.bank_code === 'QRIS')?.qr_code || null,
      message: 'Invoice created successfully'
    });
    
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create payment'
    });
  }
}
