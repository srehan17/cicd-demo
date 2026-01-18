require('dotenv').config();

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

app.get('/api/projects', async (req, res) => {
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

app.post('/api/projects', async (req, res) => {
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

app.get('/api/projects/:id/documents', async (req, res) => {
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

app.post('/api/projects/:id/documents', async (req, res) => {
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

app.delete('/api/projects/:id', async (req, res) => {
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

app.delete('/api/documents/:id', async (req, res) => {
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
