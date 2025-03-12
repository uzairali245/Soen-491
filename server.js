const express = require('express');
const movieRoutes = require('./routes/movie_routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Use the movie routes
app.use('/api', movieRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
