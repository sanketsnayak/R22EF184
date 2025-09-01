// utils/shortCodeGen.js
function generateShortCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  while (result.length < length) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default generateShortCode;
