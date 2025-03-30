const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

const app = express();
const saltRounds = 10;

// Admin felhasználó hash-elt jelszavával (jelszó: "jelszo123")
const adminUser = {
  id: 1,
  username: 'admin',
  // A jelszó hash-elt változata (előre generált bcrypt-el)
  passwordHash: bcrypt.hashSync('jelszo123', saltRounds)
};

// Middleware-k beállítása
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
  secret: 'mySecretKey', // Éles környezetben használd a környezeti változókat!
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false  // Fejlesztéshez false, HTTPS esetén true
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport lokális stratégia bcrypt használatával
passport.use(new LocalStrategy((username, password, done) => {
  if (username !== adminUser.username) {
    return done(null, false, { message: 'Hibás hitelesítő adatok.' });
  }
  bcrypt.compare(password, adminUser.passwordHash, (err, isMatch) => {
    if (err) return done(err);
    if (isMatch) {
      return done(null, adminUser);
    } else {
      return done(null, false, { message: 'Hibás hitelesítő adatok.' });
    }
  });
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  if (id === adminUser.id) {
    done(null, adminUser);
  } else {
    done(new Error("Nem található felhasználó"), null);
  }
});

// Bejelentkezés útvonal
app.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Sikeres bejelentkezés', user: req.user });
});

// Védett admin útvonal
app.get('/admin', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ message: 'Üdvözöljük az admin felületen' });
  } else {
    res.status(401).json({ message: 'Nincs jogosultság' });
  }
});

// Smart Plug váltó API végpont (példaként)
app.post('/api/smartplug', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Nincs jogosultság' });
  }
  const { state } = req.body;
  // Itt valósítsd meg a smart plug vezérlését!
  console.log(`Smart plug állapota: ${state}`);
  res.json({ message: `Smart plug állapota ${state}` });
});

// Kijelentkezés útvonal
app.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Hiba történt a kijelentkezés során' });
    }
    res.json({ message: 'Sikeres kijelentkezés' });
  });
});

// Szerver indítása
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Szerver fut a ${PORT}-es porton`);
});
