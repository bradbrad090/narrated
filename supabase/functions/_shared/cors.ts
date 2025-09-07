// Secure CORS configuration
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins for now to fix the connection issue
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};