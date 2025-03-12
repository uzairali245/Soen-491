const express = require('express');
const { fetchAndStoreMovies } = require('../controllers/movie_controller');

const router = express.Router();

router.get('/populate-movies', fetchAndStoreMovies);

module.exports = router;
