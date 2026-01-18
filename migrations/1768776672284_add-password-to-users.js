exports.up = (pgm) => {
  pgm.addColumn('users', {
    password_hash: { type: 'text', notNull: true }
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('users', 'password_hash');
};