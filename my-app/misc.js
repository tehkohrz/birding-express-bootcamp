import {
  response,
} from 'express';

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

export default {
  logError,
  formatKeys,
  formatDate,
};
