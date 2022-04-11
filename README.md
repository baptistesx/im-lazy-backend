# ImLazy backend API

ImLazy was at the beggining only a Node.js bot using Puppeteer module to invite workaway members in the area to meetup.
Then it evolved with a ReactJs UI and now taking a "SAAS template" form. (auth, user management...)

This project correspond to the backend API for the [**ImLazy** app frontend](https://github.com/baptistesx/im-lazy-frontend).
**Node.js** framework is used with **Express** module for the server.
**PostgreSQL** is used for the database.
[**Sequelize**](https://sequelize.org/) is used as an interface for the db.
[**PassportJs**](https://www.passportjs.org/) is used for local and Google OAuth2 authentication.

## 1: Setup PostgreSQL

> **TODO:** To fill up this part

- To fill up the db

## 2: Setup project

- ### `git clone git@github.com:baptistesx/im-lazy-backend.git`
- ### `cd im-lazy-backend`
- Ask for .env file to Baptiste
- Replace .env.dist with .env received
- ### `npm i`

The next steps are inspired by https://www.sqlshack.com/setting-up-a-postgresql-database-on-mac/
To work locally on macos :

- install brew: /bin/bash -c “$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)”
- brew update
- install postgres: brew install postgresql
- brew services start postgresql
- to stop the service: brew services stop postgresql

- configure postgres database server
- $ psql postgres
  CREATE ROLE newUser WITH LOGIN PASSWORD ‘password’;
  ALTER ROLE newUser CREATEDB;
- \q (to quit)
  (If error while connecting to psql server locally:
- rm /usr/local/var/postgres/postmaster.pid
- brew services restart postgresql)
- install pg admin to navigate Postgres Database server (https://www.pgadmin.org/download/)

- change DATABASE_DEV_URL env var with local username & password
- ### `sequelize db:create`
- ### `sequelize db:migrate`

- # `npm run dev`

## Various TODOs

- Setup error handler and backend logs save in file
- Use typescript strict
- Check Todos in the code
