// Import required libraries
const express = require('express');
const session = require('express-session');
const adminRoute = require('./adminRoute');
const marksRoute = require('./marksRoute');

// Create an Express application
const app = express();
const port = 3000;

// Middleware setup
app.use(express.json()); // Parse JSON request bodies
app.use(express.static('public/scripts')); // Serve static files from the 'public/scripts' directory

// Configure session middleware
app.use(session({
  secret: 'chacha',
  resave: false,
  saveUninitialized: false
}));

// Define main route for the root path
app.get('/', (req, res) => {
  // Implementation for the root route
  res.send("Hello World!"); // Send a simple response
});

// Use adminRoute for admin-related routes
app.use('/admin', adminRoute);

// Use marksRoute for marks-related routes
app.use('/marks', marksRoute);

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
