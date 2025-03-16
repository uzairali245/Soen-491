const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const initDb = async () => {
    try {
        await pool.query(`  
      
      -- Movies Table
CREATE TABLE IF NOT EXISTS movies (
    movie_id SERIAL PRIMARY KEY,
    tmdb_id BIGINT NOT NULL UNIQUE,
    imdb_id VARCHAR(25),
    watchmode_id INT,
    title VARCHAR(50),
    plot TEXT,
    viewers_rating NUMERIC(3,1) CHECK (viewers_rating >= 0 AND viewers_rating <= 10),
    release_year INTEGER,
    poster_path TEXT
);

-- Countries Table
CREATE TABLE IF NOT EXISTS countries (
    country_id SERIAL PRIMARY KEY,
    country_name VARCHAR(255),
    country_code VARCHAR(20),
    UNIQUE (country_name, country_code)
);

-- Genres Table
CREATE TABLE IF NOT EXISTS genres (
    genre_id int PRIMARY KEY,
    genre_type VARCHAR(255)
);

-- Keywords Table
CREATE TABLE IF NOT EXISTS keywords (
    keyword_id int unique,
    words VARCHAR(255) primary key
);

-- Languages Table
CREATE TABLE IF NOT EXISTS languages (
    language_id SERIAL PRIMARY KEY,
    movie_language VARCHAR(255) Unique
);

-- Actors Table
CREATE TABLE IF NOT EXISTS actors (
    actor_id int unique,
    actor_name VARCHAR(255) PRIMARY KEY
);

-- Directors Table
CREATE TABLE IF NOT EXISTS directors (
    director_id int unique,
    director_name VARCHAR(255) PRIMARY KEY
);

-- Junction Tables for Many-to-Many Relationships

-- Movies to Countries (for movies that are co-produced in multiple countries)
CREATE TABLE IF NOT EXISTS movie_countries (
    movie_id INT REFERENCES movies(movie_id) ON DELETE CASCADE,
    country_id INT REFERENCES countries(country_id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, country_id)
);


-- Movies to Genres (for movies with multiple genres)
CREATE TABLE IF NOT EXISTS movie_genres (
    movie_id INT REFERENCES movies(movie_id) ON DELETE CASCADE,
    genre_id INT REFERENCES genres(genre_id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

-- Movies to Keywords (for adding multiple keywords to a movie)
CREATE TABLE IF NOT EXISTS movie_keywords (
    movie_id INT REFERENCES movies(movie_id) ON DELETE CASCADE,
    keyword_id INT REFERENCES keywords(keyword_id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, keyword_id)
);

-- Movies to Languages (for movies with multiple language options)
CREATE TABLE IF NOT EXISTS movie_languages (
    movie_id INT REFERENCES movies(movie_id) ON DELETE CASCADE,
    language_id INT REFERENCES languages(language_id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, language_id)
);

-- Movies to Actors (for movies with multiple actors)
CREATE TABLE IF NOT EXISTS movie_actors (
    movie_id INT REFERENCES movies(movie_id) ON DELETE CASCADE,
    actor_id INT REFERENCES actors(actor_id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, actor_id)
);

-- Movies to Directors (for movies with multiple directors)
CREATE TABLE IF NOT EXISTS movie_directors (
    movie_id INT REFERENCES movies(movie_id) ON DELETE CASCADE,
    director_id INT REFERENCES directors(director_id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, director_id)
);

      CREATE TABLE IF NOT EXISTS  users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

-- User Favorites Table
CREATE TABLE IF NOT EXISTS user_favorites (
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    movie_id INT REFERENCES movies(movie_id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, movie_id)
);
      CREATE TABLE IF NOT EXISTS  user_ratings (
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        movie_id INT REFERENCES movies(movie_id) ON DELETE CASCADE,
        rating NUMERIC(3,1) CHECK (rating >= 0 AND rating <= 10),
        rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, movie_id)
      );
    `);
        console.log('Database initialized');
    } catch (err) {
        console.error('Error initializing DB:', err);
    }
};

module.exports = { pool, initDb };