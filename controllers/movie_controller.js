const axios = require('axios');
const pool = require('../db'); // PostgreSQL connection pool

const TMDB_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlZGQ1YTQ2NWJkZGViNTA0YWUzOWYxMDU5NDQ1M2U4NiIsIm5iZiI6MTczMTQ1NTAzOC4zMDc0Nzk5LCJzdWIiOiI2NzMzZTc0Zjk0YWZjMzlhMmE3MDI2MzYiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.tCuMs0Iq0Vpw3Mq-bsavY1FZFTj3Q7vXQBuhNFwKOM8';
const WATCHMODE_API_KEY = '3695c2b148msh1fbf157fe452eb6p1fb5c8jsn00cd86f2c351';

const fetchAndStoreMovies = async (req, res) => {
    try {
        const discoverResponse = await axios.get(`https://api.themoviedb.org/3/discover/movie?page=6`, {
            headers: {Authorization: `Bearer ${TMDB_API_KEY}`}
        });
        const movies = discoverResponse.data.results;

        for (const movie of movies) {
            const movieDetails = await fetchMovieDetails(movie.id);

            const watchmodeId = movieDetails.imdb_id ? await fetchWatchmodeId(movieDetails.imdb_id) : null;

            // Store data in the database
            await insertMovieData(movieDetails, watchmodeId);
        }

        res.status(200).send('Movies fetched and stored in the database');
    } catch (error) {
        console.error('Error fetching or storing movies:', error.message);
        res.status(500).send('Failed to fetch and store movies');
    }
};

const fetchMovieDetails = async (tmdb_id) => {
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/movie/${tmdb_id}`, {
            headers: {Authorization: `Bearer ${TMDB_API_KEY}`},
            params: {append_to_response: `credits,keywords`}
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching movie details for TMDB ID ${tmdb_id}:`, error.message);
        throw error;
    }
};

const fetchWatchmodeId = async (imdb_id) => {
    try {
        const response = await axios.get(`https://watchmode.p.rapidapi.com/search/`, {
            params: {search_field: 'imdb_id', search_value: imdb_id, types: 'movie'},
            headers: {
                'X-RapidAPI-Key': WATCHMODE_API_KEY,
                'X-RapidAPI-Host': 'watchmode.p.rapidapi.com'
            }
        });
        return response.data.title_results[0]?.id || null;
    } catch (error) {
        console.error(`Error fetching WatchMode ID for IMDb ID ${imdb_id}:`, error.message);
        return null; // Handle cases where no WatchMode ID is found
    }
};

const insertMovieData = async (movie, watchmodeId) => {
    try {
        const {
            id: tmdb_id,
            imdb_id,
            title,
            overview: plot,
            release_date,
            vote_average,
            genres,
            spoken_languages,
            production_countries,
            credits,
            keywords,
            poster_path
        } = movie;

        const release_year = release_date ? parseInt(release_date.split('-')[0]) : null;
        const viewers_rating = vote_average;

        // Insert movie into the movies table
        const movieResult = await pool.query(
            `INSERT INTO movies (tmdb_id, imdb_id, title, plot, release_year, viewers_rating, poster_path)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (tmdb_id) DO NOTHING
             RETURNING movie_id`,
            [tmdb_id, imdb_id, title, plot, release_year, viewers_rating, poster_path]
        );

        const movie_id = movieResult.rows[0]?.movie_id;
        if (!movie_id) return; // Skip if the movie already exists

        // Insert WatchMode ID (if available)
        if (watchmodeId) {
            await pool.query(
                `UPDATE movies SET watchmode_id = $1 WHERE movie_id = $2`,
                [watchmodeId, movie_id]
            );
        }

        // Insert genres
        // console.log("Genres:", genres);

        for (const genre of genres) {
            // Check if genre exists in `genres` table
            let genreResult = await pool.query(
                `SELECT genre_id FROM genres WHERE genre_id = $1`,
                [genre.id]
            );

            // If genre doesn't exist, insert it
            let genre_id = genreResult.rows[0]?.genre_id;
            if (!genre_id) {
                genreResult = await pool.query(
                    `INSERT INTO genres (genre_id, genre_type)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING
             RETURNING genre_id`,
                    [genre.id, genre.name]
                );
                genre_id = genreResult.rows[0]?.genre_id;
            }

            // Insert into movie_genres table
            if (genre_id && movie_id) {
                await pool.query(
                    `INSERT INTO movie_genres (movie_id, genre_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
                    [movie_id, genre_id]
                );
            }
        }


        // console.log("countries", production_countries)
        // Insert production countries
        for (const country of production_countries) {
            // Try to retrieve the country_id if it already exists
            let countryResult = await pool.query(
                `SELECT country_id FROM countries WHERE country_code = $1 OR country_name = $2`,
                [country.iso_3166_1, country.name]
            );

            let country_id = countryResult.rows[0]?.country_id;

            // If the country doesn't exist, insert it
            if (!country_id) {
                countryResult = await pool.query(
                    `INSERT INTO countries (country_code, country_name)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING
             RETURNING country_id`,
                    [country.iso_3166_1, country.name]
                );
                country_id = countryResult.rows[0]?.country_id;
            }

            // Insert into movie_countries table if we have a country_id
            if (country_id) {
                await pool.query(
                    `INSERT INTO movie_countries (movie_id, country_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
                    [movie_id, country_id]
                );
            }
        }

        // Insert languages
        for (const language of spoken_languages) {
            // Try to insert the language, or get it if it already exists
            let langResult = await pool.query(
                `INSERT INTO languages (movie_language)
         VALUES ($1)
         ON CONFLICT (movie_language) DO NOTHING
         RETURNING language_id`,
                [language.name]
            );

            // If language already exists, retrieve its ID
            if (!langResult.rows[0]) {
                langResult = await pool.query(
                    `SELECT language_id FROM languages WHERE movie_language = $1`,
                    [language.name]
                );
            }

            const language_id = langResult.rows[0]?.language_id;
            if (language_id) {
                await pool.query(
                    `INSERT INTO movie_languages (movie_id, language_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
                    [movie_id, language_id]
                );
            }
        }

// Insert actors
        for (const actor of credits.cast) {
            let actorResult = await pool.query(
                `INSERT INTO actors (actor_id, actor_name)
         VALUES ($1, $2)
         ON CONFLICT (actor_id) DO NOTHING
         RETURNING actor_id`,
                [actor.id, actor.name]
            );

            if (!actorResult.rows[0]) {
                actorResult = await pool.query(
                    `SELECT actor_id FROM actors WHERE actor_id = $1`,
                    [actor.id]
                );
            }

            const actor_id = actorResult.rows[0]?.actor_id;
            if (actor_id) {
                await pool.query(
                    `INSERT INTO movie_actors (movie_id, actor_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
                    [movie_id, actor_id]
                );
            }
        }

// Insert directors
        for (const director of credits.crew) {
            let directorResult = await pool.query(
                `INSERT INTO directors (director_id, director_name)
         VALUES ($1, $2)
         ON CONFLICT (director_id) DO NOTHING
         RETURNING director_id`,
                [director.id, director.name]
            );

            if (!directorResult.rows[0]) {
                directorResult = await pool.query(
                    `SELECT director_id FROM directors WHERE director_id = $1`,
                    [director.id]
                );
            }

            const director_id = directorResult.rows[0]?.director_id;
            if (director_id) {
                await pool.query(
                    `INSERT INTO movie_directors (movie_id, director_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
                    [movie_id, director_id]
                );
            }
        }

// Insert keywords
        for (const keyword of keywords.keywords) {
            let keywordResult = await pool.query(
                `INSERT INTO keywords (keyword_id, words)
         VALUES ($1, $2)
         ON CONFLICT (keyword_id) DO NOTHING
         RETURNING keyword_id`,
                [keyword.id, keyword.name]
            );

            if (!keywordResult.rows[0]) {
                keywordResult = await pool.query(
                    `SELECT keyword_id FROM keywords WHERE keyword_id = $1`,
                    [keyword.id]
                );
            }

            const keyword_id = keywordResult.rows[0]?.keyword_id;
            if (keyword_id) {
                await pool.query(
                    `INSERT INTO movie_keywords (movie_id, keyword_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
                    [movie_id, keyword_id]
                );
            }
        }


        // console.log(`Inserted movie: ${title}`);
    } catch (error) {
        console.error(`Error inserting movie data: ${error.message}`);
    }
};

const rateMovie = async (req, res) => {
    const { movieId, rating } = req.body;
    const userId = req.user.userId; // From authenticateToken middleware

    if (!movieId || !rating || rating < 0 || rating > 10) {
        return res.status(400).json({ error: 'Valid movieId and rating (0-10) required' });
    }

    try {
        await pool.query(
            'INSERT INTO user_ratings (user_id, movie_id, rating) VALUES ($1, $2, $3) ON CONFLICT (user_id, movie_id) DO UPDATE SET rating = $3',
            [userId, movieId, rating]
        );
        res.status(201).json({ message: 'Rating saved' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save rating' });
    }
};

const addToFavorites = async (req, res) => {
    const { movieId } = req.body;
    const userId = req.user.userId; // From authenticateToken middleware

    if (!movieId) {
        return res.status(400).json({ error: 'movieId is required' });
    }

    try {
        await pool.query(
            'INSERT INTO user_favorites (user_id, movie_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, movieId]
        );
        res.status(201).json({ message: 'Movie added to favorites' });
    } catch (error) {
        console.error('Error adding to favorites:', error);
        res.status(500).json({ error: 'Failed to add movie to favorites' });
    }
};

const listAllMovies = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM movies');
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing movies:', error);
        res.status(500).json({ error: 'Failed to list movies' });
    }
};

module.exports = {fetchAndStoreMovies, rateMovie, addToFavorites,listAllMovies}