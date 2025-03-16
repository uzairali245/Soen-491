const express = require('express');
const movieRoutes = require('./routes/movie_routes');
const userRoutes = require('./routes/user_routes');
const {initDb} = require("./models/db");

const app = express();
const PORT = process.env.PORT || 3000;

const cors = require('cors');
app.use(cors({ origin: 'http://localhost:3001' }));
app.use(express.json());

// Use the movie routes
app.use('/movie', movieRoutes);
app.use('/users', userRoutes);


initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize server:', err);
});
