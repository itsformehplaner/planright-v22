// PlanRight Worker - Cloudflare D1 API for Tasks, Projects, Notes
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

type Env = {
  DB: any;
  ASSETS: { fetch(request: Request): Promise<Response> };
  ADMIN_PASSWORD?: string;
};

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}
function corsOnly(status = 204): Response {
  return new Response(null, { status, headers: CORS });
}

function dateStr(d: Date | string | undefined | null): string | null {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

let schemaReady = false;
async function ensureSchema(env: Env): Promise<boolean> {
  if (schemaReady) return true;
  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      due_date DATETIME,
      start_time TEXT,
      end_time TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'active',
      category TEXT NOT NULL DEFAULT 'Work',
      parent_id TEXT,
      completion_date DATETIME,
      cancellation_note TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,
      depends_on TEXT DEFAULT '[]',
      track_daily_progress INTEGER DEFAULT 0,
      progress TEXT DEFAULT '[]',
      is_pinned INTEGER DEFAULT 0,
      recurrence TEXT DEFAULT NULL,
      original_recurring_task_id TEXT,
      project_id TEXT NOT NULL DEFAULT '1',
      task_logs TEXT DEFAULT '[]',
      outcome_note TEXT DEFAULT ''
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#4DB6AC',
      icon TEXT DEFAULT 'folder',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      archived INTEGER NOT NULL DEFAULT 0
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      project_id TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      tasks_json TEXT NOT NULL DEFAULT '[]',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS login_attempts (
      ip TEXT PRIMARY KEY,
      attempts INTEGER DEFAULT 1,
      last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)`).run();
    schemaReady = true;
    return true;
  } catch (e) {
    console.error('Schema error:', e);
    return false;
  }
}

async function storedHash(env: Env): Promise<string | null> {
  try {
    const row = await env.DB.prepare("SELECT value FROM config WHERE key = 'admin_hash'").first();
    return row ? (row.value as string) : null;
  } catch { return null; }
}
async function setupRequired(env: Env): Promise<boolean> {
  if (env.ADMIN_PASSWORD) return false;
  await ensureSchema(env);
  return !(await storedHash(env));
}
async function verifyPassword(env: Env, password: string): Promise<boolean> {
  if (env.ADMIN_PASSWORD) {
    const expected = env.ADMIN_PASSWORD;
    if (password.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= password.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  }
  const hash = await storedHash(env);
  if (!hash) return false;
  return (await sha256Hex(password)) === hash;
}
async function createSession(env: Env): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token, expires_at) VALUES (?, ?)').bind(token, expiresAt).run();
  return token;
}
async function validateSession(env: Env, token: string | null): Promise<boolean> {
  if (!token) return false;
  const row = await env.DB.prepare('SELECT token FROM sessions WHERE token = ? AND expires_at > ?').bind(token, new Date().toISOString()).first();
  return !!row;
}
function clientIp(req: Request): string {
  return req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown';
}
async function getLoginAttempt(env: Env, ip: string): Promise<{ attempts: number; lastAttempt: string }> {
  const row = await env.DB.prepare('SELECT attempts, last_attempt FROM login_attempts WHERE ip = ?').bind(ip).first();
  if (!row) return { attempts: 0, lastAttempt: '' };
  return { attempts: row.attempts as number, lastAttempt: row.last_attempt as string };
}
async function rateAllowed(env: Env, ip: string): Promise<boolean> {
  const { attempts, lastAttempt } = await getLoginAttempt(env, ip);
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    const now = Date.now();
    const last = new Date(lastAttempt).getTime();
    if (now - last < RATE_WINDOW_MS) return false;
  }
  return true;
}
async function rateFail(env: Env, ip: string): Promise<void> {
  const { attempts } = await getLoginAttempt(env, ip);
  if (attempts > 0) {
    await env.DB.prepare('UPDATE login_attempts SET attempts = ?, last_attempt = ? WHERE ip = ?').bind(attempts + 1, new Date().toISOString(), ip).run();
  } else {
    await env.DB.prepare('INSERT INTO login_attempts (ip, attempts, last_attempt) VALUES (?, 1, ?)').bind(ip, new Date().toISOString()).run();
  }
}
async function rateReset(env: Env, ip: string): Promise<void> {
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
}
async function getAuthToken(req: Request, env: Env): Promise<string | null> {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token && await validateSession(env, token)) return token;
  return null;
}

async function handleTasks(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const id = parts[2];

  if (req.method === 'OPTIONS') return corsOnly();
  const token = await getAuthToken(req, env);
  if (!token) return json({ error: 'Unauthorized' }, 401);
  if (!(await ensureSchema(env))) return json({ error: 'Database unavailable' }, 503);

  if (!id) {
    if (req.method === 'GET') {
      const projectId = url.searchParams.get('project');
      const status = url.searchParams.get('status');
      const category = url.searchParams.get('category');
      let sql = 'SELECT * FROM tasks';
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (projectId) { conditions.push('project_id = ?'); values.push(projectId); }
      if (status) { conditions.push('status = ?'); values.push(status); }
      if (category) { conditions.push('category = ?'); values.push(category); }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' ORDER BY created_at DESC';
      const result = await env.DB.prepare(sql).bind(...values).all();
      return json((result.results || []).map((r: any) => ({
        id: r.id, title: r.title, description: r.description,
        due_date: r.due_date, start_time: r.start_time, end_time: r.end_time,
        priority: r.priority, status: r.status, category: r.category,
        parent_id: r.parent_id, completion_date: r.completion_date,
        cancellation_note: r.cancellation_note, created_at: r.created_at,
        updated_at: r.updated_at, depends_on: r.depends_on ? JSON.parse(r.depends_on) : [],
        track_daily_progress: r.track_daily_progress,
        progress: r.progress ? JSON.parse(r.progress) : [],
        is_pinned: r.is_pinned,
        recurrence: r.recurrence ? JSON.parse(r.recurrence) : null,
        original_recurring_task_id: r.original_recurring_task_id,
        project_id: r.project_id,
        task_logs: r.task_logs ? JSON.parse(r.task_logs) : [],
        outcome_note: r.outcome_note,
      })));
    }
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const taskId = String(body.id ?? crypto.randomUUID());
      await env.DB.prepare(`INSERT INTO tasks (id, title, description, due_date, start_time, end_time, priority, status, category, parent_id, completion_date, cancellation_note, created_at, updated_at, depends_on, track_daily_progress, progress, is_pinned, recurrence, original_recurring_task_id, project_id, task_logs, outcome_note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        taskId, body.title ?? '', body.description ?? '', dateStr(body.dueDate),
        body.startTime ?? null, body.endTime ?? null,
        body.priority ?? 'medium', body.status ?? 'active', body.category ?? 'Work',
        body.parentId ?? null, dateStr(body.completionDate), body.cancellationNote ?? null,
        dateStr(new Date()), dateStr(new Date()),
        JSON.stringify(body.dependsOn ?? []), body.trackDailyProgress ? 1 : 0,
        JSON.stringify(body.progress ?? []), body.isPinned ? 1 : 0,
        body.recurrence ? JSON.stringify(body.recurrence) : null,
        body.originalRecurringTaskId ?? null, body.projectId ?? '1',
        JSON.stringify(body.taskLogs ?? []), body.outcomeNote ?? ''
      ).run();
      const row = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first();
      return json({
        id: row!.id, title: row!.title, description: row!.description,
        due_date: row!.due_date, start_time: row!.start_time, end_time: row!.end_time,
        priority: row!.priority, status: row!.status, category: row!.category,
        parent_id: row!.parent_id, completion_date: row!.completion_date,
        cancellation_note: row!.cancellation_note, created_at: row!.created_at,
        updated_at: row!.updated_at, depends_on: row!.depends_on ? JSON.parse(row!.depends_on) : [],
        track_daily_progress: row!.track_daily_progress,
        progress: row!.progress ? JSON.parse(row!.progress) : [],
        is_pinned: row!.is_pinned,
        recurrence: row!.recurrence ? JSON.parse(row!.recurrence) : null,
        original_recurring_task_id: row!.original_recurring_task_id,
        project_id: row!.project_id,
        task_logs: row!.task_logs ? JSON.parse(row!.task_logs) : [],
        outcome_note: row!.outcome_note,
      }, 201);
    }
    if (req.method === 'PUT') {
      const body = await req.json().catch(() => []);
      if (!Array.isArray(body)) return json({ error: 'Expected array' }, 400);
      await env.DB.prepare('DELETE FROM tasks').run();
      const stmt = env.DB.prepare(`INSERT INTO tasks (id, title, description, due_date, start_time, end_time, priority, status, category, parent_id, completion_date, cancellation_note, created_at, updated_at, depends_on, track_daily_progress, progress, is_pinned, recurrence, original_recurring_task_id, project_id, task_logs, outcome_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const t of body) {
        await stmt.bind(t.id, t.title ?? '', t.description ?? '', dateStr(t.dueDate),
          t.startTime ?? null, t.endTime ?? null,
          t.priority ?? 'medium', t.status ?? 'active', t.category ?? 'Work',
          t.parentId ?? null, dateStr(t.completionDate), t.cancellationNote ?? null,
          dateStr(t.createdAt), dateStr(t.updatedAt ?? new Date()),
          JSON.stringify(t.dependsOn ?? []), t.trackDailyProgress ? 1 : 0,
          JSON.stringify(t.progress ?? []), t.isPinned ? 1 : 0,
          t.recurrence ? JSON.stringify(t.recurrence) : null,
          t.originalRecurringTaskId ?? null, t.projectId ?? '1',
          JSON.stringify(t.taskLogs ?? []), t.outcomeNote ?? ''
        ).run();
      }
      const result = await env.DB.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
      return json((result.results || []).map((r: any) => ({
        id: r.id, title: r.title, description: r.description,
        due_date: r.due_date, start_time: r.start_time, end_time: r.end_time,
        priority: r.priority, status: r.status, category: r.category,
        parent_id: r.parent_id, completion_date: r.completion_date,
        cancellation_note: r.cancellation_note, created_at: r.created_at,
        updated_at: r.updated_at, depends_on: r.depends_on ? JSON.parse(r.depends_on) : [],
        track_daily_progress: r.track_daily_progress,
        progress: r.progress ? JSON.parse(r.progress) : [],
        is_pinned: r.is_pinned,
        recurrence: r.recurrence ? JSON.parse(r.recurrence) : null,
        original_recurring_task_id: r.original_recurring_task_id,
        project_id: r.project_id,
        task_logs: r.task_logs ? JSON.parse(r.task_logs) : [],
        outcome_note: r.outcome_note,
      })));
    }
    if (req.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM tasks').run();
      return json({ deletedAll: true });
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  if (req.method === 'GET') {
    const row = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    if (!row) return json({ error: 'Not found' }, 404);
    return json({
      id: row.id, title: row.title, description: row.description,
      due_date: row.due_date, start_time: row.start_time, end_time: row.end_time,
      priority: row.priority, status: row.status, category: row.category,
      parent_id: row.parent_id, completion_date: row.completion_date,
      cancellation_note: row.cancellation_note, created_at: row.created_at,
      updated_at: row.updated_at, depends_on: row.depends_on ? JSON.parse(row.depends_on) : [],
      track_daily_progress: row.track_daily_progress,
      progress: row.progress ? JSON.parse(row.progress) : [],
      is_pinned: row.is_pinned,
      recurrence: row.recurrence ? JSON.parse(row.recurrence) : null,
      original_recurring_task_id: row.original_recurring_task_id,
      project_id: row.project_id,
      task_logs: row.task_logs ? JSON.parse(row.task_logs) : [],
      outcome_note: row.outcome_note,
    });
  }
  if (req.method === 'PUT') {
    const existing = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    if (!existing) return json({ error: 'Not found' }, 404);
    const body = await req.json().catch(() => ({}));
    const updates: string[] = [];
    const values: unknown[] = [];
    const fieldMap: [string, string][] = [
      ['title', 'title'], ['description', 'description'], ['dueDate', 'due_date'],
      ['startTime', 'start_time'], ['endTime', 'end_time'],
      ['priority', 'priority'], ['status', 'status'], ['category', 'category'],
      ['parentId', 'parent_id'], ['completionDate', 'completion_date'],
      ['cancellationNote', 'cancellation_note'], ['projectId', 'project_id'],
      ['isPinned', 'is_pinned'], ['outcomeNote', 'outcome_note'],
    ];
    for (const [k, col] of fieldMap) {
      if (body[k] !== undefined) {
        updates.push(`${col} = ?`);
        if (col === 'due_date' || col === 'completion_date') values.push(dateStr(body[k]));
        else if (col === 'is_pinned') values.push(body[k] ? 1 : 0);
        else values.push(body[k]);
      }
    }
    if (body.dependsOn !== undefined) {
      updates.push('depends_on = ?');
      values.push(JSON.stringify(body.dependsOn));
    }
    if (body.trackDailyProgress !== undefined) {
      updates.push('track_daily_progress = ?');
      values.push(body.trackDailyProgress ? 1 : 0);
    }
    if (body.progress !== undefined) {
      updates.push('progress = ?');
      values.push(JSON.stringify(body.progress));
    }
    if (body.recurrence !== undefined) {
      updates.push('recurrence = ?');
      values.push(body.recurrence ? JSON.stringify(body.recurrence) : null);
    }
    if (body.taskLogs !== undefined) {
      updates.push('task_logs = ?');
      values.push(JSON.stringify(body.taskLogs));
    }
    updates.push('updated_at = ?');
    values.push(dateStr(new Date()));
    values.push(id);
    await env.DB.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    const updated = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    return json({
      id: updated!.id, title: updated!.title, description: updated!.description,
      due_date: updated!.due_date, start_time: updated!.start_time, end_time: updated!.end_time,
      priority: updated!.priority, status: updated!.status, category: updated!.category,
      parent_id: updated!.parent_id, completion_date: updated!.completion_date,
      cancellation_note: updated!.cancellation_note, created_at: updated!.created_at,
      updated_at: updated!.updated_at, depends_on: updated!.depends_on ? JSON.parse(updated!.depends_on) : [],
      track_daily_progress: updated!.track_daily_progress,
      progress: updated!.progress ? JSON.parse(updated!.progress) : [],
      is_pinned: updated!.is_pinned,
      recurrence: updated!.recurrence ? JSON.parse(updated!.recurrence) : null,
      original_recurring_task_id: updated!.original_recurring_task_id,
      project_id: updated!.project_id,
      task_logs: updated!.task_logs ? JSON.parse(updated!.task_logs) : [],
      outcome_note: updated!.outcome_note,
    });
  }
  if (req.method === 'DELETE') {
    const tree = await env.DB.prepare(`WITH RECURSIVE descendants(id) AS (
      SELECT id FROM tasks WHERE id = ? UNION
      SELECT t.id FROM tasks t JOIN descendants d ON t.parent_id = d.id
    ) SELECT id FROM descendants`).bind(id).all<{ id: string }>();
    const ids = (tree.results || []).map(r => r.id);
    if (ids.length > 0) {
      await env.DB.prepare(`DELETE FROM tasks WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).run();
    }
    return json({ deleted: id, removed: ids.length });
  }
  return json({ error: 'Method not allowed' }, 405);
}

async function handleProjects(req: Request, env: Env): Promise<Response> {
  const parts = req.url.split('/').filter(Boolean);
  const id = parts[2];

  if (req.method === 'OPTIONS') return corsOnly();
  const token = await getAuthToken(req, env);
  if (!token) return json({ error: 'Unauthorized' }, 401);
  if (!(await ensureSchema(env))) return json({ error: 'Database unavailable' }, 503);

  if (!id) {
    if (req.method === 'GET') {
      const result = await env.DB.prepare('SELECT * FROM projects ORDER BY created_at ASC').all();
      return json((result.results || []).map((r: any) => ({
        id: r.id, name: r.name, description: r.description, color: r.color,
        icon: r.icon, created_at: r.created_at, archived: !!r.archived,
      })));
    }
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const pid = body.id ?? crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO projects (id, name, description, color, icon, created_at) VALUES (?, ?, ?, ?, ?, ?)`).bind(
        pid, body.name ?? '', body.description ?? '', body.color ?? '#4DB6AC',
        body.icon ?? 'folder', dateStr(new Date())
      ).run();
      const row = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(pid).first();
      return json({
        id: row!.id, name: row!.name, description: row!.description, color: row!.color,
        icon: row!.icon, created_at: row!.created_at, archived: !!row!.archived,
      }, 201);
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  const seg3 = parts[3];
  if (seg3 === 'archive' && req.method === 'PATCH') {
    const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
    if (!project) return json({ error: 'Not found' }, 404);
    await env.DB.prepare('UPDATE projects SET archived = 1 WHERE id = ?').bind(id).run();
    const updated = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
    return json({
      id: updated!.id, name: updated!.name, description: updated!.description, color: updated!.color,
      icon: updated!.icon, created_at: updated!.created_at, archived: true,
    });
  }
  if (req.method === 'GET') {
    const row = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
    if (!row) return json({ error: 'Not found' }, 404);
    return json({
      id: row.id, name: row.name, description: row.description, color: row.color,
      icon: row.icon, created_at: row.created_at, archived: !!row.archived,
    });
  }
  if (req.method === 'PUT') {
    const existing = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
    if (!existing) return json({ error: 'Not found' }, 404);
    const body = await req.json().catch(() => ({}));
    await env.DB.prepare(`UPDATE projects SET name=?, description=?, color=?, icon=? WHERE id=?`)
      .bind(body.name ?? existing.name, body.description ?? existing.description,
            body.color ?? existing.color, body.icon ?? existing.icon, id).run();
    const updated = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
    return json({
      id: updated!.id, name: updated!.name, description: updated!.description, color: updated!.color,
      icon: updated!.icon, created_at: updated!.created_at, archived: !!updated!.archived,
    });
  }
  if (req.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
    return json({ deleted: id });
  }
  return json({ error: 'Method not allowed' }, 405);
}

async function handleNotes(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const id = parts[2];

  if (req.method === 'OPTIONS') return corsOnly();
  const token = await getAuthToken(req, env);
  if (!token) return json({ error: 'Unauthorized' }, 401);
  if (!(await ensureSchema(env))) return json({ error: 'Database unavailable' }, 503);

  if (!id) {
    if (req.method === 'GET') {
      const projectId = url.searchParams.get('project');
      let sql = 'SELECT * FROM notes';
      const vals: unknown[] = [];
      if (projectId) { sql += ' WHERE project_id = ?'; vals.push(projectId); }
      sql += ' ORDER BY updated_at DESC';
      const result = await env.DB.prepare(sql).bind(...vals).all();
      return json((result.results || []).map((r: any) => ({
        id: r.id, title: r.title, content: r.content,
        project_id: r.project_id, created_at: r.created_at, updated_at: r.updated_at,
      })));
    }
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const nid = body.id ?? crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO notes (id, title, content, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).bind(
        nid, body.title ?? '', body.content ?? '', body.projectId ?? null,
        dateStr(new Date()), dateStr(new Date())
      ).run();
      const row = await env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(nid).first();
      return json({
        id: row!.id, title: row!.title, content: row!.content,
        project_id: row!.project_id, created_at: row!.created_at, updated_at: row!.updated_at,
      }, 201);
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  if (req.method === 'GET') {
    const row = await env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
    if (!row) return json({ error: 'Not found' }, 404);
    return json({
      id: row.id, title: row.title, content: row.content,
      project_id: row.project_id, created_at: row.created_at, updated_at: row.updated_at,
    });
  }
  if (req.method === 'PUT') {
    const existing = await env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
    if (!existing) return json({ error: 'Not found' }, 404);
    const body = await req.json().catch(() => ({}));
    await env.DB.prepare(`UPDATE notes SET title=?, content=?, project_id=?, updated_at=? WHERE id=?`)
      .bind(body.title ?? existing.title, body.content ?? existing.content,
            body.projectId ?? existing.project_id, dateStr(new Date()), id).run();
    const updated = await env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
    return json({
      id: updated!.id, title: updated!.title, content: updated!.content,
      project_id: updated!.project_id, created_at: updated!.created_at, updated_at: updated!.updated_at,
    });
  }
  if (req.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();
    return json({ deleted: id });
  }
  return json({ error: 'Method not allowed' }, 405);
}

async function handleTemplates(req: Request, env: Env): Promise<Response> {
  const parts = req.url.split('/').filter(Boolean);
  const id = parts[2];

  if (req.method === 'OPTIONS') return corsOnly();
  const token = await getAuthToken(req, env);
  if (!token) return json({ error: 'Unauthorized' }, 401);
  if (!(await ensureSchema(env))) return json({ error: 'Database unavailable' }, 503);

  if (!id) {
    if (req.method === 'GET') {
      const result = await env.DB.prepare('SELECT * FROM templates ORDER BY created_at DESC').all();
      return json((result.results || []).map((r: any) => ({
        id: r.id, name: r.name, description: r.description,
        tasks_json: r.tasks_json, created_at: r.created_at,
      })));
    }
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const tid = body.id ?? crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO templates (id, name, description, tasks_json, created_at) VALUES (?, ?, ?, ?, ?)`).bind(
        tid, body.name ?? '', body.description ?? '', JSON.stringify(body.tasks ?? []), dateStr(new Date())
      ).run();
      return json({ id: tid, message: 'Template created' }, 201);
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  const seg3 = parts[3];
  if (seg3 === 'use' && req.method === 'POST') {
    const tpl = await env.DB.prepare('SELECT * FROM templates WHERE id = ?').bind(id).first();
    if (!tpl) return json({ error: 'Not found' }, 404);
    const tasks: any[] = JSON.parse((tpl.tasks_json as string) ?? '[]');
    const createdIds: string[] = [];
    for (const t of tasks) {
      const tid = crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO tasks (id, title, description, due_date, priority, status, category, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        tid, t.title ?? '', t.description ?? '', dateStr(t.dueDate),
        t.priority ?? 'medium', t.status ?? 'active', t.category ?? 'Work',
        t.projectId ?? '1', dateStr(new Date())
      ).run();
      createdIds.push(tid);
    }
    return json({ createdTasks: createdIds });
  }
  if (req.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(id).run();
    return json({ deleted: id });
  }
  return json({ error: 'Method not allowed' }, 405);
}

async function handleNotifications(req: Request, env: Env): Promise<Response> {
  const parts = req.url.split('/').filter(Boolean);
  const id = parts[2];
  const seg3 = parts[3];

  if (req.method === 'OPTIONS') return corsOnly();
  const token = await getAuthToken(req, env);
  if (!token) return json({ error: 'Unauthorized' }, 401);
  if (!(await ensureSchema(env))) return json({ error: 'Database unavailable' }, 503);

  if (!id) {
    if (req.method === 'GET') {
      const result = await env.DB.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all();
      return json((result.results || []).map((r: any) => ({
        id: r.id, task_id: r.task_id, message: r.message,
        read: !!r.read, created_at: r.created_at,
      })));
    }
    return json({ error: 'Method not allowed' }, 405);
  }
  if (seg3 === 'unread-count' && req.method === 'GET') {
    const r = await env.DB.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE read = 0').first();
    return json({ count: (r as any)?.cnt ?? 0 });
  }
  if (seg3 === 'read' && req.method === 'PATCH') {
    await env.DB.prepare('UPDATE notifications SET read = 1 WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }
  if (seg3 === 'mark-all-read' && req.method === 'PATCH') {
    await env.DB.prepare('UPDATE notifications SET read = 1').run();
    return json({ ok: true });
  }
  if (req.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM notifications WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, 405);
}

async function handleAuth(req: Request, env: Env, action: string): Promise<Response> {
  if (req.method === 'OPTIONS') return corsOnly();
  const ip = clientIp(req);
  await ensureSchema(env);

  if (action === 'status' && req.method === 'GET') {
    return json({ setupRequired: await setupRequired(env) });
  }
  if (action === 'setup' && req.method === 'POST') {
    if (!(await rateAllowed(env, ip))) return json({ error: 'Too many attempts' }, 429);
    const body = await req.json().catch(() => ({}));
    const password = String(body.password ?? '');
    if (password.length < 8) { await rateFail(env, ip); return json({ error: 'Password must be at least 8 characters.' }, 400); }
    if (!(await setupRequired(env))) return json({ error: 'Setup already completed' }, 403);
    if (await storedHash(env)) return json({ error: 'Setup already completed' }, 403);
    await env.DB.prepare(`INSERT INTO config (key, value, updated_at) VALUES ('admin_hash', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(await sha256Hex(password), dateStr(new Date())).run();
    await rateReset(env, ip);
    const token = await createSession(env);
    return json({ token, message: 'Password created' }, 201);
  }
  if (action === 'login' && req.method === 'POST') {
    if (!(await rateAllowed(env, ip))) return json({ error: 'Too many attempts' }, 429);
    const body = await req.json().catch(() => ({}));
    const password = String(body.password ?? '');
    if (!(await verifyPassword(env, password))) { await rateFail(env, ip); return json({ error: 'رمز عبور اشتباه است' }, 401); }
    await rateReset(env, ip);
    const token = await createSession(env);
    return json({ token, message: 'ورود موفق' });
  }
  if (action === 'verify' && req.method === 'GET') {
    const auth = req.headers.get('Authorization') || '';
    const valid = await validateSession(env, auth.replace('Bearer ', ''));
    return json({ valid });
  }
  if (action === 'logout' && req.method === 'POST') {
    const auth = req.headers.get('Authorization') || '';
    if (auth.startsWith('Bearer ')) {
      await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(auth.slice(7)).run();
    }
    return json({ ok: true });
  }
  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    if (request.method === 'OPTIONS') return corsOnly();

    if (parts[0] === 'api') {
      if (parts[1] === 'tasks') return handleTasks(request, env);
      if (parts[1] === 'projects') return handleProjects(request, env);
      if (parts[1] === 'notes') return handleNotes(request, env);
      if (parts[1] === 'templates') return handleTemplates(request, env);
      if (parts[1] === 'notifications') return handleNotifications(request, env);
      if (parts[1] && ['login', 'setup', 'verify', 'logout', 'status'].includes(parts[1])) {
        return handleAuth(request, env, parts[1]);
      }
      return json({ error: 'Not found' }, 404);
    }
    if (parts[0] === 'health') return json({ ok: true });

    if (request.method === 'GET' || request.method === 'HEAD') {
      return env.ASSETS.fetch(new Request(new URL('/index.html', url).toString(), request));
    }
    return json({ error: 'Not found' }, 404);
  },
};
