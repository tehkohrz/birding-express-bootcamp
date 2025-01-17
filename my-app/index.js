import express, {
  response,
} from 'express';
import pg from 'pg';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';
import helps from './misc.js';

// PG Declarations
const {
  Pool,
} = pg;
const pgConnectionConfigs = {
  user: 'tehkohrz',
  host: 'localhost',
  database: 'birdbird',
  port: 5432, // Postgres server always runs on this port by default
};
const pool = new Pool(pgConnectionConfigs);

// Express Declarations
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({
  extended: false,
}));
app.use(cookieParser());
app.use(methodOverride('_method'));

const entryTemplate = {
  date: {
    label: 'Date',
    inputTag: 'input',
    type: 'date',
  },
  habitat: {
    label: 'Habitat',
    inputTag: 'input',
    type: 'text',
  },
  species: {
    label: 'Species',
    inputTag: 'dropdown',
    type: 'text',
  },
  appearance: {
    label: 'Appearance',
    inputTag: 'input',
    type: 'text',
  },
  behaviour: {
    label: 'Behaviour',
    inputTag: 'dropdown',
    type: 'text',
  },
  vocalisation: {
    label: 'Vocalisation',
    inputTag: 'input',
    type: 'text',
  },
  flock_size: {
    label: 'Flock Size',
    inputTag: 'input',
    type: 'number',
  },

};

// Route to list of notes within the table
app.get('/', (req, res) => {
  const login = helps.checkCookie(req.cookies, res);
  const userDetails = req.cookies;
  const sqlQuery = 'SELECT * FROM notes';
  // Query to database for data of notes
  pool.query(sqlQuery, (err, result) => {
    const empty = helps.logError(err, result.rows);
    const data = {
      notes: result.rows,
    };
    res.render('main', {
      data,
      empty,
      login,
      userDetails,
    });
  });
});

// Route to insert new note
app.get('/note', (req, res) => {
  const login = helps.checkCookie(req.cookies, res);
  const userDetails = req.cookies;
  // Check for login in else redirect to somewhere else
  if (login) {
    // Check for species in db
    const query = 'SELECT * FROM species';
    pool.query(query, (err, result) => {
      const birdSpecies = result.rows;
      const innerQuery = 'SELECT * FROM behaviours';
      pool.query(innerQuery, (innerErr, innerResult) => {
        helps.logError(innerErr, innerResult);
        const behaviours = innerResult.rows;
        res.render('form', {
          entryTemplate,
          birdSpecies,
          login,
          userDetails,
          behaviours,
        });
      });
    });
  } else {
    res.redirect('/login');
  }
});

// POST route to save note into the database
app.post('/note', (req, res) => {
  // Check for userID to link the entry in the DB
  const {
    user,
  } = req.cookies;
  const userQuery = `SELECT * FROM users WHERE email = '${user}'`;
  pool.query(userQuery, (userError, userResult) => {
    helps.logError(userError, userResult);

    const formData = req.body;
    const sqlQuery = `INSERT INTO notes (habitat,  date, appearance, behaviour, vocalisation, flock_size, user_id, species_id) VALUES ('${formData.habitat}', '${formData.date}', '${formData.appearance}', '${formData.behaviour}', '${formData.vocalisation}', '${formData.flock_size}', '${userResult.rows[0].id}','${formData.species_id}') RETURNING *`;
    // Have to put inside the callback else the async will screw it up
    pool.query(sqlQuery, (err, result) => {
      helps.logError(err, result);
      const {
        id,
      } = result.rows[0];
      // Send the user back to an empty note or the note itself
      res.redirect(`/note/${id}`);
    });
  });
});

// Route to individual note
app.get('/note/:id', (req, res) => {
  const login = helps.checkCookie(req.cookies, res);
  const userDetails = req.cookies;
  const {
    id,
  } = req.params;
  console.log('ID', id);
  const sqlQuery = `SELECT  notes.id, notes.habitat, notes.date, notes.appearance, notes.behaviour, notes.vocalisation, notes.flock_size, notes.user_id, notes.species_id, species.name AS species, users.email
  FROM notes INNER JOIN species ON notes.species_id = species.id 
  INNER JOIN users ON notes.user_id = users.id 
  WHERE notes.id=${id}`;
  pool.query(sqlQuery, (err, result) => {
    helps.logError(err, result);
    const data = result.rows[0];
    console.log('Note Data', data);
    // Retrieve all the comments for the note
    const innerQuery = `SELECT comments.id, comments.comment_data, date, comments.user_id, comments.note_id, users.email, users.id FROM comments INNER JOIN users ON users.id = comments.user_id WHERE comments.note_id = ${id}`;
    pool.query(innerQuery, (innerErr, innerResult) => {
      let commentsData = [];
      if (!helps.logError(innerErr, innerQuery)) {
        commentsData = [...innerResult.rows];
      }
      commentsData.sort((a, b) => b.date - a.date);
      res.render('single-note', {
        data,
        entryTemplate,
        login,
        userDetails,
        commentsData,
      });
    });
  });
});

// Deletion of note
app.delete('/note/:id', (req, res) => {
  const {
    id,
  } = req.params;
  const sqlQuery = `DELETE FROM notes WHERE id = ${id}`;
  pool.query(sqlQuery, (err, result) => {
    helps.logError(err, result);
    res.redirect('/');
  });
});

// Route to edit form for note
app.get('/note/:id/edit', (req, res) => {
  const login = helps.checkCookie(req.cookies, res);
  const userDetails = req.cookies;
  // Check for not logged in send to log in page
  if (!login) {
    res.redirect('/login');
  } else {
    const {
      id,
    } = req.params;
    // Query the note information
    const sqlQuery = `SELECT notes.id, habitat, date, appearance, behaviour, vocalisation, flock_size, notes.user_id, users.id, email FROM notes INNER JOIN users ON notes.user_id = users.id WHERE notes.id = '${id}'`;
    pool.query(sqlQuery, (err, result) => {
      helps.logError(err, result);
      const noteData = {
        ...result.rows[0],
      };
      noteData.date = helps.formatDate(noteData.date);
      // Check for correct user
      if (req.cookies.user === result.rows[0].email) {
        res.render('edit-form', {
          entryTemplate,
          noteData,
          login,
          userDetails,
        });
      } else {
        res.send('You are not authorised.');
      }
    });
  }
});

// Route to edit database
app.put('/note/:id/edit', (req, res) => {
  const {
    id,
  } = req.params;
  console.log('body', req.body);
  const newData = {
    ...req.body,
  };
  console.log('data', newData);

  // Loop to create SQL query
  let sqlQuery = 'UPDATE notes SET ';
  for (const [key, value] of Object.entries(newData)) {
    sqlQuery += `${key} = '${value}',`;
  }
  // Remove the last comma
  sqlQuery = sqlQuery.slice(0, sqlQuery.length - 1);
  sqlQuery += `WHERE id=${id}`;
  // Redirect to the notes viewing
  pool.query(sqlQuery, (err, result) => {
    helps.logError(err, result);
    res.redirect(`/note/${id}`);
  });
});

// Route for inserting new species
app.get('/species', (req, res) => {
  // Check for log in then can insert new species
  const login = helps.checkCookie(req.cookies, res);
  const userDetails = req.cookies;
  // Check for login in else redirect to somewhere else
  if (login) {
    // Render form to enter species
    res.render('form-species', {
      login,
      userDetails,
      edit: false,
      entryTemplate,
    });
  }
  else {
    res.redirect('/login');
  }
});

// POST new species into the db
app.post('/species', (req, res) => {
  const speciesData = { ...req.body };
  const sqlQuery = `INSERT INTO species (name, species_name) VALUES (${speciesData.name}, ${speciesData.scientific_name})`;
  pool.query(sqlQuery, (err, result) => {
    helps.logError(err, result);
    res.redirect('/species/all');
  });
});

// Route to show a list of all the species
app.get('/species/all', (req, res) => {
  const login = helps.checkCookie(req.cookies, res);
  const userDetails = req.cookies;
  // Pull all species form the DB
  const sqlQuery = 'SELECT * FROM species';
  pool.query(sqlQuery, (err, result) => {
    const empty = helps.logError(err, result);
    const species = result.rows;
    res.render('species-list', {
      empty, login, userDetails, species,
    });
  });
});

// Route to view entries with the particular species
app.get('/species/:id', (req, res) => {
  const { id } = req.params;
  const login = helps.checkCookie(req.cookies, res);
  const userDetails = req.cookies;
  // Retrieve all entries that are of the selected species id
  const sqlQuery = `SELECT notes.id, notes.species_id, species.name, species.scientific_name, notes.date, notes.habitat FROM species INNER JOIN notes ON notes.species_id = species.id WHERE notes.species_id = ${id}`;
  pool.query(sqlQuery, (err, result) => {
    const empty = helps.logError(err, result);
    console.log(result.rows);
    const data = result.rows;
    res.render('species-notes', {
      login, userDetails, data, empty,
    });
  });
});

// Deletion of species entry
app.delete('/species/:id', (req, res) => {
  const { id } = req.params;
  const login = helps.checkCookie(req.cookies, res);
  const userDetails = req.cookies;
  // If user logged in then can delete species
  if (login) {
    const sqlQuery = `DELETE FROM species WHERE id = ${id}`;
    pool.query(sqlQuery, (err, result) => {
      helps.logError(err, result);
      res.redirect('/species/all');
    });
  } else {
    res.redirect('/login');
  }
  // If user logged in then can delete species
  if (login) {
    const sqlQuery = `DELETE FROM species WHERE id = ${id}`;
    pool.query(sqlQuery, (err, result) => {
      helps.logError(err, result);
      res.redirect('/species/all');
    });
  } else {
    res.redirect('/login');
  }
});

// Route to editing of species
app.get('/species/:id/edit', (req, res) => {
  const { id } = req.params;
  const login = helps.checkCookie(req.cookies, res);
  const userDetails = req.cookies;
  // If user logged in then can edit species
  if (login) {
    const sqlQuery = `SELECT * FROM species WHERE id = ${id}`;
    pool.query(sqlQuery, (err, result) => {
      helps.logError(err, result);
      const data = result.rows[0];
      res.render('form-species', {
        data, edit: true, login, userDetails,
      });
    });
  } else {
    res.redirect('/login');
  }
});

// Update of bird species info
app.put('/species/:id/edit', (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const sqlQuery = 'UPDATE species SET';
  for (const [key, value] of Object.entries(newData)) {
    sqlQuery += `${key} = '${value}',`;
  }
  // Remove the last comma
  sqlQuery = sqlQuery.slice(0, sqlQuery.length - 1);
  sqlQuery += `WHERE id=${id}`;
});

// @@@@@@@@@@@@@@@@@@@@@@@@ USER PORTION @@@@@@@@@@@@@@@@@@@@@@@@@@
// Route to the signup page
app.get('/signup', (req, res) => {
  const values = {
    email: '',
    password: '',
  };
  const invalidSubmit = false;
  res.render('signup', {
    values,
    invalidSubmit,
  });
});

// Insertion of new user
app.post('/signup', (req, res) => {
  const {
    email,
    password,
  } = req.body;
  const sqlQuery = `SELECT * FROM users WHERE email='${email}'`;
  pool.query(sqlQuery, (err, result) => {
    helps.logError(err, result);
    // Check for existing user
    if (result.rows.length === 0) {
      // Hashing the password
      const hashedPwd = helps.hashPassword(password);
      const insertQuery = `INSERT INTO users ( email, password) VALUES ('${email}', '${hashedPwd}')`;
      pool.query(insertQuery, (innerErr, innerResult) => {
        helps.logError(innerErr, innerResult);
        // Redirect to the login in page
        res.redirect('/login');
      });
    }
    // User found re-render page
    else {
      const values = {
        ...req.body,
      };
      const invalidSubmit = true;
      res.render('signup', {
        values,
        invalidSubmit,
      });
    }
  });
});

// Route to login page
app.get('/login', (req, res) => {
  // Check for logged in cookies
  // Render already logged in page
  if (req.cookies.loggedIn) {
    const login = true;
    res.render('login', {
      login,
    });
  } else {
    // Render login
    const login = false;
    const values = {
      email: '',
      password: '',
    };
    const invalidLogin = false;
    res.render('login', {
      login,
      values,
      invalidLogin,
    });
  }
});

// POST of user login
app.post('/login', (req, res) => {
  const values = {
    ...req.body,
  };
  // Checking for existing user
  const userQuery = `SELECT * FROM users WHERE email = '${values.email}'`;
  // Return error msg
  pool.query(userQuery, (err, result) => {
    helps.logError(err, result);
    // No user, render error msg
    if (result.rows.length === 0) {
      res.render('login', {
        values,
        invalidLogin: true,
        login: false,
      });
    }
    // Correct password log in user to main page
    else if (helps.checkHash(values.password, result.rows[0].password, 'password')) {
      res.cookie('user', `${values.email}`);
      res.cookie('loggedIn', 'true');
      // Add session hash
      const sessionHash = helps.hashSession(values.email);
      res.cookie('loggedHash', `${sessionHash}`);
      res.redirect('/');
    }
    // Wrong password render error msg
    else {
      res.render('login', {
        values,
        invalidLogin: true,
        login: false,
      });
    }
  });
});

// DELETE cookie for logout
app.delete('/logout', (req, res) => {
  res.clearCookie('user');
  res.clearCookie('loggedIn');
  res.clearCookie('loggedHash');
  console.log(req.url);
  // Redirect to the same page with no login cookie
  res.redirect('/');
});

// @@@@@@@@@@@@@@@@@@@@@ COMMENTS @@@@@@@@@@@@@@@@@@@@@
app.post('/note/:id/comment', (req, res) => {
  // Check for login first
  const login = helps.checkCookie(req.cookies, res);
  // Set comment data with date
  const userDetails = req.cookies;
  const commentData = { ...req.body };
  commentData.note_id = req.params.id;
  commentData.date = new Date();
  // Get user_id so that it is easier to update when username changes
  if (login) {
    const sqlQuery = `SELECT * FROM users WHERE email = '${userDetails.user}'`;
    console.log(sqlQuery);

    pool.query(sqlQuery, (err, result) => {
      helps.logError(err, result);
      commentData.user_id = result.rows[0].id;
      // Insert data into comments database
      const innerQuery = `INSERT INTO comments (comment_data, date, user_id, note_id) VALUES ('${commentData.comment}', '${commentData.date}','${commentData.user_id}', '${commentData.note_id}')`;
      pool.query(innerQuery, (innerErr, innerResult) => {
        helps.logError(innerErr, innerResult);
        console.log('DATA', commentData);
        res.redirect(`/note/${commentData.note_id}`);
      });
    });
  } else {
    res.redirect('/login');
  }
});

app.listen(3004);

// EXAMPLE FOR PROMISES
// const asyncOp = () => new Promise ((resolve) => {
//      setTimeout(() => resolve(console.log(
//      'hello world')), 2000);
//      return 'chicken';
//  })
//  const promise = asyncOp();
//  console.log(promise);

// const hello  = await promise;
// console.log('done',hello);
