export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-attempt, x-max-retries, x-requested-with, accept, accept-encoding, accept-language, cache-control, pragma, connection, host, origin, referer, sec-fetch-dest, sec-fetch-mode, sec-fetch-site, user-agent',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Expose-Headers':
    'Content-Disposition, Content-Type, Content-Length, X-File-Name, X-File-Id, X-Download-Results',
};
