// server.js with CORS and secure login

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const saltRounds = 10;

// Admin user (hashed password: 'jelszo123')
const adminUser = {
  id: 1,
  username: 'admin',
  passwordHash: '$2b$10$O5OYi9.flRBeifwhT5u5F.I1Eq4QFjXU4aDftZx.hdErPBpDnMgc2'
};

// === CORS Config ===
const allowedOrigin = 'https://balintkiss.github.io';
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

// === Middleware ===
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'mySecretKey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false // true only if using HTTPS directly
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// === Passport Local Strategy ===
passport.use(new LocalStrategy((username, password, done) => {
  if (username !== adminUser.username) {
    return done(null, false, { message: 'Hibás hitelesítő adatok.' });
  }
  bcrypt.compare(password, adminUser.passwordHash, (err, isMatch) => {
    if (err) return done(err);
    if (isMatch) return done(null, adminUser);
    return done(null, false, { message: 'Hibás hitelesítő adatok.' });
  });
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  if (id === adminUser.id) {
    done(null, adminUser);
  } else {
    done(new Error('Felhasználó nem található'), null);
  }
});

// === Routes ===
app.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Sikeres bejelentkezés', user: req.user });
});

app.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ message: 'Kijelentkezési hiba' });
    res.json({ message: 'Sikeres kijelentkezés' });
  });
});

app.get('/admin', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ message: 'Admin felület' });
  } else {
    res.status(401).json({ message: 'Nincs jogosultság' });
  }
});

app.post('/api/smartplug', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Nincs jogosultság' });
  }
  const { state } = req.body;
  console.log(`Smart plug állapota: ${state}`);
  res.json({ message: `Smart plug állapota: ${state}` });
});

// === Server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Szerver fut: http://localhost:${PORT}`);
});
