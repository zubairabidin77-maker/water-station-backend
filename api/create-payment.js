
// api/create-payment.js - FIXED
import Xendit from 'xendit-node';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { orderId, amount, volume, customer, paymentMethod } = req.body;
    
    const xendit = new Xendit({
      secretKey: process.env.XENDIT_SECRET_KEY,
    });
    
    const { Invoice } = xendit;
    const invoice = new Invoice({});
    
    const invoiceData = await invoice.createInvoice({
      externalId: orderId,
      amount: amount,
      description: 'Air Minum ' + volume + 'ml',
      currency: 'IDR',
      payerEmail: customer?.email || 'customer@waterstation.com',
      customer: {
        givenNames: customer?.name || 'Customer',
        email: customer?.email || '',
        mobileNumber: customer?.phone || ''
      },
      items: [{
        name: 'Air Minum ' + volume + 'ml',
        quantity: 1,
        price: amount,
        category: 'Food & Beverage'
      }],
      paymentMethods: paymentMethod ? [paymentMethod] : ['QRIS'],
      successRedirectUrl: 'https://water-station-zubair.web.app/payment/success.html',
      failureRedirectUrl: 'https://water-station-zubair.web.app/payment/failed.html',
      invoiceDuration: 86400
    });
    
    const firebaseUrl = 'https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/' + orderId + '.json';
    
    await fetch(firebaseUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        amount,
        volume,
        status: 'pending',
        xenditInvoiceId: invoiceData.id,
        invoiceUrl: invoiceData.invoiceUrl,
        expiryDate: invoiceData.expiryDate,
        customer: customer || {},
        createdAt: Date.now()
      })
    });
    
    res.status(200).json({
      success: true,
      invoiceId: invoiceData.id,
      invoiceUrl: invoiceData.invoiceUrl,
      expiryDate: invoiceData.expiryDate,
      orderId: orderId
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

