const { pool } = require('../models/db');

const getRecommendations = async (req, res) => {
    const userId = req.user.userId;

    try {
        // Get preferred genres
        const genreQuery = `
            SELECT DISTINCT mg.genre_id
            FROM user_ratings ur
                     JOIN movie_genres mg ON ur.movie_id = mg.movie_id
            WHERE ur.user_id = $1 AND ur.rating >= 7
            UNION
            SELECT DISTINCT mg.genre_id
            FROM user_favorites uf
                     JOIN movie_genres mg ON uf.movie_id = mg.movie_id
            WHERE uf.user_id = $1;
        `;
        const genreResult = await pool.query(genreQuery, [userId]);
        const preferredGenres = genreResult.rows.map(row => row.genre_id);

        if (preferredGenres.length === 0) {
            return res.status(404).json({ message: 'Rate or favorite some movies first!' });
        }

        // Get distinct movies
        const movieQuery = `
            SELECT DISTINCT ON (m.movie_id)
                m.movie_id,
                m.title,
                m.viewers_rating,
                m.poster_path
            FROM movies m
                JOIN movie_genres mg ON m.movie_id = mg.movie_id
            WHERE mg.genre_id = ANY($1)
              AND m.movie_id NOT IN (
                SELECT movie_id FROM user_ratings WHERE user_id = $2
                )
              AND m.movie_id NOT IN (
                SELECT movie_id FROM user_favorites WHERE user_id = $2
                )
            ORDER BY m.movie_id, m.viewers_rating DESC
                LIMIT 15;
        `;
        const movieResult = await pool.query(movieQuery, [preferredGenres, userId]);
        res.json(movieResult.rows);
    } catch (error) {
        console.error('Recommendation error:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
};

module.exports = { getRecommendations };