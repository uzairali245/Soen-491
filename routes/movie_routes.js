const express = require('express');
const {fetchAndStoreMovies, addToFavorites, rateMovie} = require('../controllers/movie_controller');
const {authenticateToken} = require('../utils/authMiddlerware');
const {getRecommendations} = require('../controllers/recommendation_controller');
const router = express.Router();

router.get('/populate-movies', fetchAndStoreMovies);
router.post('/rate', authenticateToken, rateMovie);
router.post('/favorite', authenticateToken, addToFavorites);
router.get('/recommendations', authenticateToken, getRecommendations);

module.exports = router;
