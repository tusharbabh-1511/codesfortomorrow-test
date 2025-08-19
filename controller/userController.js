const express = require('express');
const jwt = require('jsonwebtoken');
const UserRoutes = express.Router();
const db = require('../config/db');
const JWT_TOKEN_KEY = process.env.JWT_SECRET;

UserRoutes.post('/register', async (req, res) => {
    console.log('Register endpoint hit');
    const { name, username, password } = req.body;

    //validation inputs
    if (!name || !username || !password) {
        return res.status(400).json({ error: 'name. username, password All fields are required' });
    }

    try {
        // Check if the user already exists
        const [existingUser] = await db.query('SELECT * FROM tbl_user WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Insert the new user into the database
        const [result] = await db.query('INSERT INTO tbl_user (name, username, password) VALUES (?, ?, ?)', [name, username, password]);
        if (result.affectedRows === 0) {
            return res.status(500).json({ error: 'Failed to register user' });
        }
        else
            return res.status(201).json({ message: 'User registered successfully' });
    }
    catch (error) {
        console.error('Error during registration:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

UserRoutes.post('/login', async (req, res) => {
    const { username, password } = req.body;
    //validation inputs
    if (!username || !password) {
        return res.status(400).json({ error: 'username and password are required' });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM tbl_user WHERE username = ? AND password = ? ', [username, password]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ id: rows[0].id, username: rows[0].username }, JWT_TOKEN_KEY, { expiresIn: '1h' });


        // If login is successful, you can send a success response
        return res.status(200).json({ message: 'Login successful', token: token });


    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = UserRoutes;