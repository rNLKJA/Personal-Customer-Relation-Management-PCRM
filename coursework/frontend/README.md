<div align="center">

# Personal Customer Relationship Management (PCRM)

A mobile-first web app for managing your personal network — contacts, interactions and where you met them.

<!-- badges -->

![React](https://img.shields.io/badge/React-16-61DAFB?logo=react&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=black)
![Material UI](https://img.shields.io/badge/Material%20UI-5-007FFF?logo=mui&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-16-339933?logo=node.js&logoColor=white)
![University of Melbourne](https://img.shields.io/badge/University%20of%20Melbourne-COMP30022-094183)
![Semester](https://img.shields.io/badge/Semester%202-2021-blue)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## Overview

PCRM is a Personal Customer Relationship Management web application built for the University of Melbourne **COMP30022 IT Project** (Semester 2, 2021). It helps an individual keep track of the people in their network — not just names and contact details, but the history of how and where they have interacted.

This repository holds the **front-end client** (a Create React App single-page application). It talks to a separate Express + MongoDB back-end over a JWT-authenticated REST API. The app is designed for a mobile viewport (best viewed at 375 x 812px, iPhone X size).

> **Note:** This is an archived university project. The original deployment at `crm4399.herokuapp.com` (back-end) and `pcrm4399.herokuapp.com` (front-end) was hosted on Heroku and may no longer be live.

## Features

- **Authentication** — register, log in, reset password, and a "fast register" flow via a shareable invite link (`/fastRegister/:id/:authCode`). Sessions are held with a JWT stored in the browser, and protected routes guard the app.
- **Contacts** — view your contact list, open a contact for full detail, and add new contacts three ways: manual entry, scanning another user's QR code, or entering their user ID.
- **Interaction records** — log and browse a timeline of interactions, each able to capture a location so you remember where a meeting happened.
- **Map view** — see contacts and interaction locations on a Google Map with places autocomplete.
- **Your profile** — view and manage your own profile and generate a personal QR code so others can add you quickly.
- **Mobile-first UI** — built with Material UI and Bootstrap, tuned for a phone-sized screen.

## Tech Stack

| Layer                    | Technology                                                                  |
| ------------------------ | --------------------------------------------------------------------------- |
| Framework                | React 16 (Create React App, `react-scripts`)                                |
| Routing                  | React Router DOM 5                                                          |
| UI                       | Material UI (MUI 5 + Material-UI 4), React Bootstrap, Emotion, Font Awesome |
| Maps                     | Google Maps via `@react-google-maps/api` and `use-places-autocomplete`      |
| QR codes                 | `qrcode`, `react-qr-reader`, `react-qr-scanner`                             |
| HTTP client              | Axios (with a JWT request interceptor)                                      |
| Auth                     | JWT stored in `localStorage`                                                |
| Testing                  | Jest, React Testing Library, Enzyme, Taiko (end-to-end)                     |
| Back-end (separate repo) | Node.js, Express, MongoDB                                                   |
| Hosting                  | Heroku (original deployment)                                                |

## Project Structure

```
Personal-Customer-Relation-Management-PCRM/
├── public/              Static assets (icons, images, index.html)
├── src/
│   ├── API/             React components grouped by feature
│   │   ├── auth/        Login, registration, password reset, protected routes
│   │   ├── contact/     Contact list, detail, and add flows (manual / QR / user ID)
│   │   ├── record/      Interaction records and record detail
│   │   ├── map/         Google Maps view
│   │   ├── person/      User profile and personal QR code
│   │   ├── fastRegister/ Invite-link registration
│   │   ├── nav/ heading/ home/ error/  Shared UI and shell
│   │   └── axiosClient/ Configured Axios instance with JWT interceptor
│   ├── BackEndAPI/      Functions and hooks that call the REST back-end
│   ├── hooks/           Auth/session hooks (useAuth, useFindUser, UserContext)
│   ├── App.js           Route definitions
│   └── index.js         App entry point
└── netlify.toml         SPA redirect config
```

## Getting Started

### Prerequisites

- Node.js 16 and npm 6
- A Google Maps JavaScript API key
- A running instance of the PCRM back-end (Express + MongoDB), or access to the original deployed API

### Environment Variables

Create a `.env` file in the project root:

```bash
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
PORT=3000
BACK_END_API_PATH="http://localhost:5000"
SKIP_PREFLIGHT_CHECK=true
```

### Install and Run (Front-End)

```bash
# install dependencies
npm install

# start the development server (http://localhost:3000)
npm start

# create a production build
npm run build

# run unit tests
npm test

# run the Taiko end-to-end test
npm run taiko
```

### Back-End

The back-end (Node.js, Express, MongoDB) lives in a separate repository and must be running for authentication, contacts, records, and profiles to work. Point `BACK_END_API_PATH` (and the base URL in `src/API/axiosClient/axiosClient.js`) at your back-end instance.

## Notes

- This project was produced by COMP30022 Team 4399. Sunchuangyu (Rin) Huang served as Scrum Master.
- The API base URL is currently hard-coded to the original Heroku deployment in a few files (for example `src/API/axiosClient/axiosClient.js`); update these to your own back-end before running locally.
- The repository's `.gitignore` excludes `package.json` and `*.json` files, so the front-end dependency manifest is not tracked here. The dependency list is preserved in the bundled `COMP30022-49-Front-End.zip` archive.
- This is a student project kept for reference and portfolio purposes; it is not actively maintained.

## License

Released under the [MIT License](LICENSE).
