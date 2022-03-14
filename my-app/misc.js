import jsSHA from 'jssha';

function logError(err, result) {
  if (err) {
    console.log(err);
    return true;
  }
  if (result.length <= 0) {
    console.log('Nothing found');
    response.status(404);
    return true;
  }
  if (result === undefined) {
    console.log('Undefined Result');
    return true;
  }
  return false;
}

// Capitalise the first letter of each word
// @param keys{array}
function formatKeys(keys) {
  keys.forEach((element) => {
    const newKey = element.replace('_', ' ');
    const word = newKey.split(' ');
    // split and capitalise if there are multiple words
    for (let i = 0; i < word.length; i += 1) {
      word[i] = word[i][0].toUpperCase() + word[i].substr(1);
    }
    word.join(' ');
    return word;
  });
}

function formatDate(dateString) {
  const dateObj = new Date(dateString);
  let day = dateObj.getDate();
  if (day < 10) {
    day = `0${day}`;
  }
  let month = dateObj.getMonth();
  if (month < 10) {
    month = `0${month}`;
  }
  const dateReturn = `${dateObj.getFullYear()}-${month}-${day}`;
  return dateReturn;
}

const SECRETSALT = 't0shib0i';

function hashPassword(password) {
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  shaObj.update(`${password}`);
  const hash = shaObj.getHash('HEX');
  return hash;
}

// checks that the input string is the same after hashing
// Default for session hash, can toggle for pwd
function checkHash(unhashedString, hashString, toggle) {
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  if (toggle === 'password') {
    shaObj.update(`${unhashedString}`);
  } else {
    const sessionString = unhashedString + SECRETSALT;
    shaObj.update(`${sessionString}`);
  }
  const hashed = shaObj.getHash('HEX');
  if (hashed === hashString) {
    return true;
  }
  return false;
}

// creates session hash with SALT
function hashSession(userId) {
  const unhashed = userId + SECRETSALT;
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  shaObj.update(unhashed);
  const sessionHash = shaObj.getHash('HEX');
  return sessionHash;
}

function checkCookie(userCookie, response) {
  if (userCookie.length === 0) {
    response.cookie('loggedIn', 'false');
    return false;
  }
  const checkSession = checkHash(userCookie.user, userCookie.loggedHash);
  return checkSession;
}

export default {
  logError,
  formatKeys,
  formatDate,
  hashPassword,
  checkHash,
  hashSession,
  checkCookie,
};
