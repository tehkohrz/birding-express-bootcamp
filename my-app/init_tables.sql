CREATE TABLE IF NOT EXISTS notes (id SERIAL PRIMARY KEY,
habitat TEXT,
date DATE,
appearance TEXT,
behaviour TEXT,
vocalisation TEXT,
flock_size INTEGER,
user_id INTEGER,
species_id INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT,
  password TEXT
);

CREATE TABLE IF NOT EXISTS species (
  id SERIAL PRIMARY KEY,
  name TEXT,
  scientific_name TEXT
);

