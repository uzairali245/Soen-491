import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Signup from './components/Signup';
import Login from './components/Login';
import Movies from './components/Movies';
import Recommendations from './components/Recommendations';

function App() {
    return (
        <Router>
            <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-grow">
                    <Routes>
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/movies" element={<Movies />} />
                        <Route path="/recommendations" element={<Recommendations />} />
                        <Route path="/" element={<div><a href="/signup">Go to Signup</a></div>} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;