exports.up = (pgm) => {
  pgm.createTable('users', {
    id: 'id',
    email: { type: 'text', notNull: true, unique: true },
    name: { type: 'text', notNull: true },
    role: { type: 'text', notNull: true, default: 'user' },
    created_at: { type: 'timestamp', default: pgm.func('now()') }
  });

  pgm.createTable('projects', {
    id: 'id',
    name: { type: 'text', notNull: true },
    deleted_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', default: pgm.func('now()') }
  });

  pgm.createTable('documents', {
    id: 'id',
    project_id: {
      type: 'integer',
      notNull: true,
      references: '"projects"',
      onDelete: 'cascade'
    },
    title: { type: 'text', notNull: true },
    deleted_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', default: pgm.func('now()') }
  });

  pgm.addConstraint(
    'documents',
    'documents_unique_title_per_project',
    {
      unique: ['project_id', 'title']
    }
  );

  pgm.createTable('project_memberships', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'cascade'
    },
    project_id: {
      type: 'integer',
      notNull: true,
      references: '"projects"',
      onDelete: 'cascade'
    },
    role: { type: 'text', notNull: true, default: 'viewer' },
    joined_at: { type: 'timestamp', default: pgm.func('now()') }
  });

  pgm.addConstraint(
    'project_memberships',
    'unique_user_project',
    {
      unique: ['user_id', 'project_id']
    }
  );
};

exports.down = (pgm) => {
  pgm.dropTable('project_memberships');
  pgm.dropTable('documents');
  pgm.dropTable('projects');
  pgm.dropTable('users');
};
