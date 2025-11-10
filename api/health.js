// Serverless function for health check
module.exports = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ZimCrowd API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    database: 'Supabase'
  });
};
