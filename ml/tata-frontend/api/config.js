export default function handler(req, res) {
  // Returns the environment variable set in Vercel's dashboard
  res.status(200).json({
    API_BASE: process.env.RENDER_BACKEND_URL || 'http://localhost:8000'
  });
}
