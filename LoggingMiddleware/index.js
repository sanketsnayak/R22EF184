import axios from 'axios';

const BACKEND_ONLY = new Set(['cache','controller','cron_job','db','domain','handler','repository','route','service']);
const FRONTEND_ONLY = new Set(['api','component','hook','page','state','style']);
const BOTH = new Set(['auth','config','middleware','utils']);
const LEVELS = new Set(['debug','info','warn','error','fatal']);

function createLogger(options = {}) {
  const baseURL = (options.baseURL || 'http://20.244.56.144').replace(/\/$/, '');
  const endpoint = `${baseURL}/evaluation-service/logs`;
  const token = options.token || process.env.LOG_TOKEN || null;
  const fireAndForget = options.fireAndForget !== false; 
  const strict = options.strict === true; 

  function toLowerString(x = '') { return String(x).toLowerCase(); }

  function validate(stack, level, pkg) {
    if (stack !== 'backend' && stack !== 'frontend') throw new Error('stack must be "backend" or "frontend"');
    if (!LEVELS.has(level)) throw new Error(`level must be one of ${[...LEVELS].join(',')}`);
    const allowed = new Set([...BOTH, ...(stack === 'backend' ? BACKEND_ONLY : FRONTEND_ONLY)]);
    if (!allowed.has(pkg)) throw new Error(`package "${pkg}" not allowed for stack "${stack}"`);
  }

  async function send(payload) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return axios.post(endpoint, payload, { headers }).then(r => r.data);
  }

  async function log(stack, level, pkg, message, meta) {
    // enforce lowercase and types
    const s = toLowerString(stack);
    const l = toLowerString(level);
    const p = toLowerString(pkg);
    try {
      validate(s, l, p);
    } catch (err) {
      if (strict) throw err;
      
      console.error('[logger] validation failed:', err.message);
      return null;
    }

  
    if (!token) {
      return null;
    }

    const payload = { stack: s, level: l, package: p, message: String(message || '') };
    if (meta) payload.meta = meta;
    if (options.app) payload.app = options.app;

    if (fireAndForget) {
      send(payload).catch(e => {
        
        console.error('[logger] send failed:', e && e.message ? e.message : e);
      });
      return null;
    } else {
      return send(payload);
    }
  }

 
  function logSafe(...args) {
    try {
      return log(...args);
    } catch (e) {
      console.error('[logger] logSafe caught', e.message);
      return null;
    }
  }

  
  function expressRequestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        
        logSafe('backend', 'info', 'middleware',
          `HTTP ${req.method} ${req.originalUrl} -> ${res.statusCode}`,
          { duration_ms: Date.now() - start, ip: req.ip });
      });
      next();
    };
  }

  
  function expressErrorLogger() {
    return (err, req, res, next) => {
      logSafe('backend','error','handler', err && err.message ? err.message : 'Unhandled error', {
        path: req && req.originalUrl,
        stack: err && err.stack
      });
      next(err);
    };
  }

  return { log, logSafe, expressRequestLogger, expressErrorLogger };
}

export { createLogger };
