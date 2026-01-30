// api/webhook.js - FIXED VERSION
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const webhookData = req.body;
    const { external_id, status } = webhookData;
    
    console.log(`Webhook: ${external_id} - ${status}`);
    
    // Update Firebase
    const firebaseUrl = 'https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/transactions/' + external_id + '.json';
    
    await fetch(firebaseUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentStatus: status,
        updatedAt: Date.now()
      })
    });
    
    // Jika pembayaran sukses
    if (status === 'PAID') {
      const transactionRes = await fetch(firebaseUrl);
      const transactionData = await transactionRes.json();
      
      if (transactionData) {
        // Kirim ke ESP32
        const commandUrl = 'https://water-station-zubair-default-rtdb.asia-southeast1.firebasedatabase.app/devices/WS-001/command.json';
        
        await fetch(commandUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: external_id,
            status: "pending",
            type: "fill_water",
            volume: transactionData.volume,
            amount: transactionData.amount,
            timestamp: Date.now()
          })
        });
      }
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(200).json({ received: true });
  }

}
