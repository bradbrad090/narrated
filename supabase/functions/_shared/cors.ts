// Secure CORS configuration
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://narrated.com.au',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// For development, you may need to add additional origins
const isDev = Deno.env.get('DENO_DEPLOYMENT_ID') === undefined;
if (isDev) {
  corsHeaders['Access-Control-Allow-Origin'] = '*'; // Allow all origins in development
}