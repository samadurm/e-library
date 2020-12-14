# eLibrary 

### Introduction
eLibrary is a web application backend for book libraries with an online service. It is used to track individual contributor donations to an online library. 

The application models 3 entities, which include User, Book, and Library. Book has a 1 to Many relationship with both User and with Library. That is, a Library can have many books, and a User can donate many books, but a Book may only belong to a single library and be donated by a single contributor.

The application protects the User who donated a book to a particular library, and only that User may apply CRUD operations to the books they donated. The application uses Google's OAuth 2.0 for user authorization, and when the user logs in they are added as a User entity to the database using the sub field of the JWT token they are provided. Then any applications with a Google issued JWT token for the future will be protected for the User. 

### Technologies Used
* Google Cloud Datastore
* Javascript
* Express
* HTML
* CSS

### Skills Demonstrated
* authorization using Google OAuth 2.0
* authentication using JWT tokens
* RESTful design

### Launch 
1. Clone the repository to your local machine
2. in server.js, add url that service will be deployed to in *app_url* variable (change it from being empty)
3. add a client_secret.json file in top level directory of project
4. deploy to your service and use *npm start* to start the server
