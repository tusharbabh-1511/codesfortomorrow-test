require('dotenv').config();
const express = require('express');
const db = require('./config/db');
const categoryRoutes = require('./controller/categoryController');
const UserRoutes = require('./controller/userController');
const JwtAuthMiddleware = require('./middleware/jwtCheck');
const app = express();
const PORT = 3000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log('Middleware is working : ' + req.method + ' ' + req.url);
    // res.send('server is workingcheck');
    next();
});

app.use(UserRoutes);

app.get('/categories',JwtAuthMiddleware, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM tbl_category');
        if (rows.length > 0) {
            return res.status(200).json({msg : "success", data : rows});
        }
        return res.status(404).json({ msg: 'No categories found' });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.use('/category',JwtAuthMiddleware,categoryRoutes);



app.use((req,res,next)=>{
    console.log('no route found ' + req.method + req.url);
    res.status(404).json({ error: 'Mo such Route not found'});
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});