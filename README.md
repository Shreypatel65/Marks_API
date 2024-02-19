# MARKS API

A Node.js application providing an API for accessing and managing student marks.

## Functionality Overview
* **Admin Functions**
  * Secure login 
  * Change Admin Password
  * API key generation for external use
  * Viewing existing API keys
  * Deleting API keys
  * File upload to update student marks data (CSV format)
  * Downloading a template CSV file for data updates

* **API Functions**
  * Authentication using generated API keys
  * Fetching student marks data based on:
    * Enrollment number
    * Batch and roll number

##  Prerequisites 

* Node.js and npm (or yarn)
* MongoDB database installed and running

## Installation and Setup

1. **Clone the repository:**
    ```bash 
    git clone https://github.com/Shreypatel65/Marks_API.git
    ```
2. **Install dependencies:**

   ```bash
    cd marks-api
    npm install  
3. **Configure MongoDB connection:**

    * Update the MongoDB connection URL in the ```utils.js``` file if necessary.

4. **Create data structures (if needed):**

    *   If not already created, set up the required collections in your MongoDB database (```studinfo```, ```authdb```, and ```keydb```).

## Running the Application
1. **Start the server:**

    ```bash
    node index.js
    ```

## Using the API

 * **Admin Dashboard**

    Access the admin dashboard for login and other authorized functionality (the specific route will depend on your setup).

* **Marks API Endpoint**

  * Route: ``` /marks ```
  * Method: GET
  * Required Query Parameter:
    * ``` key ```: A valid API key (generated from the admin dashboard)
  * Additional Query Parameters:
    * ```enroll```: Enrollment number
    * ```batch```: Student batch
    * ```rollno```: Student roll number
  
  **Example usage:**
  ```
  http://localhost:3000/marks?key=YOUR_API_KEY&enroll=12345678 
  ```
**Contributing**

Contributions are welcome! Please open an issue or submit a pull request.