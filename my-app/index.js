import express from 'express';
import pg from 'pg';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
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

// const entryTemplate = {
//   date: [
//     'Date',
//     'input',
//     'date',
//   ],
//   habitat: [
//     'Habitat',
//     'input',
//     'text'],
//   appearance: [
//     'Appearance',
//     'input',
//     'text'],
//   behaviour: [
//     'Behaviour',
//     'input',
//     'text'],
//   vocalisation: [
//     'Vocalisation',
//     'input', 'text'],
//   flock_size: [
//     'Flock Size',
//     'input',
//     'number'],
// };

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
  appearance: {
    label: 'Appearance',
    inputTag: 'input',
    type: 'text',
  },
  behaviour: {
    label: 'Behaviour',
    inputTag: 'input',
    type: 'text',
  },
  vocalisation: {
    label: 'Vocalisation',
    inputTag: 'input',
  },
  flock_size: {
    label: 'Flock Size',
    inputTag: 'input',
    type: 'number',
  },
};

// Route to list of notes within the table
app.get('/', (req, res) => {
  const sqlQuery = 'SELECT * FROM notes';

  // Query to database for data of notes
  pool.query(sqlQuery, (err, result) => {
    const empty = helps.logError(err, result.rows);
    const data = {
      notes: result.rows,
      keys: helps.formatKeys(Object.keys(result.rows[0])),
    };
    res.render('main', {
      data, empty,
    });
  });
});

// Route to insert new note
app.get('/note', (req, res) => {
  const { submitted } = req.cookies;
  // Check for failed submission
  if (submitted === undefined) {
    res.cookie('submitted', false);
  }
  // Renders with the data keyed in remaining
  // May not need this with BS forms validation

  if (submitted === true) {
    const formData = req.body;
    res.render('note-submit', {
      formData, entryTemplate,
    });
  } else {
    res.render('form', {
      entryTemplate,
    }); }
});

// POST route to save note into the database
app.post('/note', (req, res) => {
  const formData = req.body;
  const sqlQuery = `INSERT INTO notes (habitat,  date, appearance, behaviour, vocalisation, flock_size) VALUES ('${formData.habitat}', '${formData.date}', '${formData.appearance}', '${formData.behaviour}', '${formData.vocalisation}', '${formData.flock_size}') RETURNING *`;
  // Have to put inside the callback else the async will screw it up
  pool.query(sqlQuery, (err, result) => {
    helps.logError(err, result);
    res.cookie('submitted', true);
    console.log('Form submitted');
    const { id } = result.rows[0];
    // Send the user back to an empty note or the note itself
    res.redirect(`/note/${id}`);
  });
});

// Route to individual note
app.get('/note/:id', (req, res) => {
  const {
    id,
  } = req.params;
  const sqlQuery = `SELECT * FROM notes WHERE id=${id}`;
  pool.query(sqlQuery, (err, result) => {
    helps.logError(err, result);
    const data = result.rows[0];
    console.log(result.rows[0]);
    console.log(result.rows[0].date);

    res.render('single-note', {
      data,
    });
  });
});

// Deletion of note
app.delete('/note/:id', (req, res) => {
  const { id } = req.params;
  const sqlQuery = `DELETE FROM notes WHERE id = ${id}`;
  pool.query(sqlQuery, (err, result) => {
    helps.logError(err, result);
    res.redirect('/');
  });
});

// Route to edit form for note
app.get('/note/:id/edit', (req, res) => {
  const { id } = req.params;
  const sqlQuery = `SELECT * FROM notes WHERE id = ${id}`;
  pool.query(sqlQuery, (err, result) => {
    helps.logError(err, result);
    const noteData = { ...result.rows[0] };
    noteData.date = helps.formatDate(noteData.date);
    res.render('edit-form', {
      entryTemplate, noteData,
    });
  });
});

// Route to edit database
app.put('/note/:id/edit', (req, res) => {
  const { id } = req.params;
  console.log('body', req.body);
  const newData = { ...req.body };
  console.log('data', newData);

  // Loop to create SQL query
  let sqlQuery = 'UPDATE notes SET ';
  for (const [key, value] of Object.entries(newData)) {
    sqlQuery += `${key} = '${value}',`;
  }
  //
  sqlQuery = sqlQuery.slice(0, sqlQuery.length - 1);
  sqlQuery += `WHERE id=${id}`;
  console.log('Query:', sqlQuery);
  // Redirect to the notes viewing
  pool.query(sqlQuery, (err, result) => {
    helps.logError(err, result);
    res.redirect(`/note/${id}`);
  });
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
