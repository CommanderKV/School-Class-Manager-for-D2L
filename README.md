# Description:
  There are two parts to this repo the "course scrapper" and the "website and api"
  The course scrapper is utilized by the api to get the course from d2l.
  To set up the website or to use the course scrapper refer to the following below.

## How to run the course scrapper:
  ### 1. Clone the repo or download the course scrapper file
  ### 2. Run the following
  ```bash 
  python main.py <username> <password> <file\to\save\to.json> <link/to/d2l/homepage>
  ```
  ### 4. The output will be put in the file path you gave it

## How to run the code on a server
  ### 1. Clone the entire repo or download it
  ### 2. Run the following
  ```bash
  pip install -r requirements.txt
  ```
  ### 3. Navigate to website/api
  ### 4. Add a .env file with the following variables
  ```env
  DB_HOST
  DB_PORT
  DB_NAME
  DB_USER
  DB_PASS
  PORT
  JWT_SECRET
  SSL_KEY
  SSL_CERT
  DEC_KEY
  DEC_IV
  ```
  ### 5. Run the following
  ```bash
  node server.js
  ```
  You should see hello world then the encrypted version and then the decrypted version
  so hello world again. You will also get details like what ip its bound to and what
  port its listening to as well.

  You will also need to change the domain names to use your own link as they are set to 
  the domain I've set it to.

