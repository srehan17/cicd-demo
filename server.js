require('dotenv').config();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const express = require('express');
const { Pool } = require('pg');

const app = express();

app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// TEMP TEST ROUTE (to verify server works)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `
      INSERT INTO users (email, name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, role
      `,
      [email, name, passwordHash]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to register' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.json({ token });
});

// middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.sendStatus(401);
  }
}

app.get('/api/projects', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, name
      FROM projects
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    await pool.query(
      'INSERT INTO projects (name) VALUES ($1)',
      [name]
    );

    res.status(201).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.get('/api/projects/:id/documents', requireAuth, async (req, res) => {
  try {
    const projectId = req.params.id;

    const result = await pool.query(
      `
      SELECT id, title
      FROM documents
      WHERE project_id = $1
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      `,
      [projectId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.post('/api/projects/:id/documents', requireAuth, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    await pool.query(
      `
      INSERT INTO documents (project_id, title)
      VALUES ($1, $2)
      `,
      [projectId, title]
    );

    res.status(201).end();
  } catch (err) {
    console.error(err);

    // Handle unique constraint violation (duplicate title in project)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Document title already exists in this project' });
    }

    res.status(500).json({ error: 'Failed to create document' });
  }
});

app.delete('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const projectId = req.params.id;

    await pool.query(
      `
      UPDATE projects
      SET deleted_at = NOW()
      WHERE id = $1
      `,
      [projectId]
    );

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

app.delete('/api/documents/:id', requireAuth, async (req, res) => {
  try {
    const documentId = req.params.id;

    await pool.query(
      `
      UPDATE documents
      SET deleted_at = NOW()
      WHERE id = $1
      `,
      [documentId]
    );

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
