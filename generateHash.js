import bcrypt from 'bcryptjs';

async function generateHash() {
    const password = 'professorfatec'; // A senha que você usará
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
}

generateHash();

// senha admin: adminfatec