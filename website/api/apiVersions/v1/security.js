const crypto = require("crypto");

// Define the algorithm
const algorithm = 'aes-256-cbc';

// Generate random key and IV as buffers
const keyBuffer = process.env.DEC_KEY;
const ivBuffer = process.env.DEC_IV;

// Convert buffers to hex strings
const key = keyBuffer.toString('hex');
const iv = ivBuffer.toString('hex');

/**
 * Encrypt a string
 * @param {string} text - The text to encrypt
 * @returns {string} - The encrypted string
 */
function encrypt(text) {
    const keyBuffer = Buffer.from(key, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    let cipher = crypto.createCipheriv(algorithm, keyBuffer, ivBuffer);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

/**
 * Decrypt an encrypted string
 * @param {string} encryptedText - The encrypted string to decrypt
 * @returns {string} - The decrypted string
 */
function decrypt(encryptedText) {
    const keyBuffer = Buffer.from(key, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    let decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Example usage
const text = 'Hello, world!';
console.log('Original text:', text);

// Encrypt the text
const encryptedText = encrypt(text, key, iv);
console.log('Encrypted text:', encryptedText);

// Decrypt the text
const decryptedText = decrypt(encryptedText, key, iv);
console.log('Decrypted text:', decryptedText);

module.exports = { encrypt, decrypt };