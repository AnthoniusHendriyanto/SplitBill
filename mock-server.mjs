import http from 'http';
import { randomUUID } from 'crypto';

const PORT = 8080;
let billCounter = 0;
const users = new Map();
const bills = new Map();
let currentUser = null;

const tokens = new Map();
let tokenCounter = 0;

function json(body, status = 200) {
  return { status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function html(status, body) {
  return { status, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : null };
}

function parseUrl(url) {
  const [path, qs] = url.split('?');
  const params = {};
  if (qs) qs.split('&').forEach(p => { const [k, v] = p.split('='); params[decodeURIComponent(k)] = decodeURIComponent(v); });
  return { path, params };
}

function getBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
  });
}

function generateTokens(userId) {
  const accessToken = `mock-at-${++tokenCounter}-${randomUUID()}`;
  const refreshToken = `mock-rt-${tokenCounter}-${randomUUID()}`;
  tokens.set(refreshToken, userId);
  return { accessToken, refreshToken };
}

const server = http.createServer(async (req, res) => {
  const { path, params } = parseUrl(req.url);
  const method = req.method.toUpperCase();

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const send = (code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(body ? JSON.stringify(body) : '');
  };

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  const userId = token.startsWith('mock-at-') ? token.split('-').pop() : null;

  try {
    // Auth routes
    if (path === '/api/v1/auth/login' && method === 'POST') {
      const { email, password } = await getBody(req);
      const user = { id: `user-${randomUUID().slice(0, 8)}`, name: email.split('@')[0], email };
      const { accessToken, refreshToken } = generateTokens(user.id);
      send(200, { user, access_token: accessToken, refresh_token: refreshToken });
      return;
    }

    if (path === '/api/v1/auth/register' && method === 'POST') {
      const { name, email } = await getBody(req);
      const user = { id: `user-${randomUUID().slice(0, 8)}`, name, email };
      const { accessToken, refreshToken } = generateTokens(user.id);
      send(200, { user, access_token: accessToken, refresh_token: refreshToken });
      return;
    }

    if (path === '/api/v1/auth/logout' && method === 'POST') {
      send(200, { message: 'Logged out' });
      return;
    }

    if (path === '/api/v1/auth/refresh' && method === 'POST') {
      const { refresh_token } = await getBody(req);
      const { accessToken, refreshToken } = generateTokens('mock-user');
      send(200, { access_token: accessToken, refresh_token: refreshToken });
      return;
    }

    // User routes
    if (path === '/api/v1/users/me') {
      if (method === 'GET') {
        send(200, { id: 'mock-user', name: 'Mock User', email: 'mock@example.com', role: 'free', ocr_used: 2, ocr_limit: 5 });
        return;
      }
      if (method === 'PUT') {
        const data = await getBody(req);
        send(200, { id: 'mock-user', name: data.name || 'Mock User', email: data.email || 'mock@example.com' });
        return;
      }
    }

    // Bills routes
    const billMatch = path.match(/^\/api\/v1\/bills(?:\/([a-zA-Z0-9-]+))?$/);
    if (billMatch) {
      const billId = billMatch[1];

      if (method === 'GET' && !billId) {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 20;
        const allBills = Array.from(bills.values());
        const paginated = allBills.slice((page - 1) * limit, page * limit);
        send(200, { bills: paginated, total: allBills.length, page, limit });
        return;
      }

      if (method === 'GET' && billId) {
        const bill = bills.get(billId);
        if (bill) {
          send(200, bill);
        } else {
          send(404, { error: { message: 'Bill not found' } });
        }
        return;
      }

      if (method === 'POST' && !billId) {
        const data = await getBody(req);
        billCounter++;
        const newBill = {
          id: `mock-bill-${billCounter}-${randomUUID().slice(0, 8)}`,
          title: data.title || 'Untitled Bill',
          items: (data.items || []).map((item, i) => ({ id: `item-${i + 1}`, ...item })),
          persons: (data.persons || []).map((p, i) => ({ id: `person-${i + 1}`, ...p })),
          assignments: data.assignments || [],
          split_type: data.split_type || 'equal',
          service_charge: data.service_charge || 0,
          tax: data.tax || 0,
          created_at: new Date().toISOString(),
          user_id: 'mock-user',
          total: (data.items || []).reduce((sum, item) => sum + (item.price || 0), 0),
        };
        bills.set(newBill.id, newBill);
        send(200, newBill);
        return;
      }

      if (method === 'DELETE' && billId) {
        bills.delete(billId);
        send(200, { message: 'Bill deleted' });
        return;
      }
    }

    // OCR
    if (path === '/api/v1/ocr' && method === 'POST') {
      send(200, {
        items: [
          { name: 'Grilled Salmon', price: 250000 },
          { name: 'Caesar Salad', price: 85000 },
          { name: 'Mineral Water', price: 25000 },
        ],
        currency: 'IDR',
      });
      return;
    }

    // Premium
    if (path === '/api/v1/premium/subscribe' && method === 'POST') {
      send(200, { message: 'Premium subscription activated', status: 'active' });
      return;
    }

    // Payments
    const paymentMatch = path.match(/^\/api\/v1\/payments\/([a-zA-Z0-9-]+)(?:\/(settle))?$/);
    if (paymentMatch) {
      if (method === 'GET') {
        send(200, { payments: [] });
        return;
      }
      if (method === 'POST' && paymentMatch[2] === 'settle') {
        send(200, { message: 'Payment settled', status: 'completed' });
        return;
      }
    }

    // Health check
    if (path === '/api/health' && method === 'GET') {
      send(200, { status: 'ok' });
      return;
    }

    send(404, { error: { message: `Not found: ${method} ${path}` } });
  } catch (err) {
    send(500, { error: { message: err.message } });
  }
});

server.listen(PORT, () => {
  console.log(`Mock backend running on http://localhost:${PORT}`);
  console.log('Endpoints: auth, bills, OCR, users, premium, payments');
});
