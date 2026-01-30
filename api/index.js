// api/index.js
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    success: true,
    message: "🚰 Water Station Backend API is Running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: [
      {
        method: "POST",
        path: "/api/create-payment",
        description: "Create new payment"
      },
      {
        method: "POST",
        path: "/api/webhook",
        description: "Xendit payment webhook"
      },
      {
        method: "GET",
        path: "/api/check-status",
        description: "Check payment status"
      }
    ],
    documentation: "Check README.md for usage instructions"
  });
}