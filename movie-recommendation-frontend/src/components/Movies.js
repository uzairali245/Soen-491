import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Movies() {
    const [movies, setMovies] = useState([]);
    const [error, setError] = useState('');
    const [ratings, setRatings] = useState({});
    const [likedMovies, setLikedMovies] = useState(new Set());

    // Fetch movies on mount
    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const response = await axios.get('http://localhost:3000/movie/list-movies');
                setMovies(response.data);
            } catch (err) {
                setError('Failed to load movies. Please try again.');
            }
        };
        fetchMovies();
    }, []);

    // Handle like/unlike toggle
    const handleLikeToggle = async (movieId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please log in to like movies.');
            return;
        }

        const isLiked = likedMovies.has(movieId);
        try {
            if (isLiked) {
                setLikedMovies((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(movieId);
                    return newSet;
                });
            } else {
                await axios.post(
                    'http://localhost:3000/movie/favorite',
                    { movieId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setLikedMovies((prev) => new Set(prev).add(movieId));
            }
        } catch (err) {
            setError('Failed to update like status.');
        }
    };

    // Handle rating change
    const handleRatingChange = (movieId, value) => {
        setRatings((prev) => ({ ...prev, [movieId]: value }));
    };

    // Save rating
    const handleSaveRating = async (movieId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please log in to rate movies.');
            return;
        }

        const rating = ratings[movieId];
        if (!rating || rating < 0 || rating > 10) {
            setError('Please enter a rating between 0 and 10.');
            return;
        }

        try {
            await axios.post(
                'http://localhost:3000/movie/rate',
                { movieId, rating },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setError('');
            alert('Rating saved!');
        } catch (err) {
            setError('Failed to save rating.');
        }
    };

    return (
        <div className="min-h-full px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
                <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-gray-900">
                    All Movies
                </h2>
                {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:mx-auto sm:w-full sm:max-w-5xl">
                {movies.map((movie) => (
                    <div
                        key={movie.movie_id}
                        className="bg-white rounded-lg shadow-md p-6 flex flex-col space-y-4"
                    >
                        {/* Poster Image */}
                        {movie.poster_path ? (
                            <img
                                src={`https://image.tmdb.org/t/p/w154${movie.poster_path}`}
                                alt={`${movie.title} poster`}
                                className="w-full h-48 object-cover rounded-md"
                            />
                        ) : (
                            <div className="w-full h-48 bg-gray-200 rounded-md flex items-center justify-center text-gray-500">
                                No Poster Available
                            </div>
                        )}

                        <h3 className="text-lg font-semibold text-gray-900">{movie.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-3">{movie.plot}</p>
                        <p className="text-sm text-gray-800">
                            <span className="font-medium">Viewer Rating:</span> {movie.viewers_rating}
                        </p>
                        <p className="text-sm text-gray-800">
                            <span className="font-medium">Release Year:</span> {movie.release_year}
                        </p>

                        {/* Like Toggle */}
                        <button
                            onClick={() => handleLikeToggle(movie.movie_id)}
                            className={`flex justify-center items-center rounded-md px-3 py-1.5 text-sm font-semibold shadow-xs ${
                                likedMovies.has(movie.movie_id)
                                    ? 'bg-red-600 text-white hover:bg-red-500'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                            } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600`}
                        >
                            {likedMovies.has(movie.movie_id) ? 'Unlike' : 'Like'}
                        </button>

                        {/* Rating Input */}
                        <div className="flex items-center space-x-2">
                            <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={ratings[movie.movie_id] || ''}
                                onChange={(e) =>
                                    handleRatingChange(movie.movie_id, parseFloat(e.target.value))
                                }
                                className="block w-20 rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
                                placeholder="0-10"
                            />
                            <button
                                onClick={() => handleSaveRating(movie.movie_id)}
                                className="flex justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                                Save Rating
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}