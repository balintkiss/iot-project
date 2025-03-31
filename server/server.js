const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// === CORS beállítás GitHub Pages frontendhez ===
const corsOptions = {
  origin: 'https://balintkiss.github.io',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // engedi az előkéréseket

// === Fontos! JSON feldolgozók rögtön a CORS után ===
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// === Statikus fájlok (ha szükséges) ===
app.use(express.static(path.join(__dirname, 'public')));

// === Session beállítás ===
app.use(session({
  secret: process.env.SESSION_SECRET || 'mySecretKey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    httpOnly: true
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// === MongoDB kapcsolat ===
mongoose.connect('mongodb+srv://balintkiss:6eo8bogDbFcI5uQo@m0.d3gpjf9.mongodb.net/wifiapp?retryWrites=true&w=majority&appName=M0')
  .then(() => console.log("✅ Kapcsolódva a MongoDB-hez"))
  .catch(err => console.error("❌ MongoDB hiba:", err));

// === Admin felhasználó ===
const adminUser = {
  id: 1,
  username: 'admin',
  passwordHash: '$2b$10$O5OYi9.flRBeifwhT5u5F.I1Eq4QFjXU4aDftZx.hdErPBpDnMgc2' // bcrypt hash
};

// === Passport stratégia ===
passport.use(new LocalStrategy((username, password, done) => {
  if (username !== adminUser.username) {
    return done(null, false, { message: 'Hibás felhasználónév.' });
  }
  bcrypt.compare(password, adminUser.passwordHash, (err, isMatch) => {
    if (err) return done(err);
    if (isMatch) return done(null, adminUser);
    return done(null, false, { message: 'Hibás jelszó.' });
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

// === Bejelentkezés ===
app.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Sikeres bejelentkezés', user: req.user });
});

// === Kijelentkezés ===
app.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ message: 'Hiba kijelentkezéskor' });
    res.json({ message: 'Sikeres kijelentkezés' });
  });
});

// === Védett admin route ===
app.get('/admin', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ message: 'Admin felület elérhető' });
  } else {
    res.status(401).json({ message: 'Nincs jogosultság' });
  }
});

// === MongoDB modell a Smart Plug állapothoz ===
const wifiSchema = new mongoose.Schema({
  state: { type: String, enum: ['on', 'off'], default: 'off' }
});
const WifiState = mongoose.model('WifiState', wifiSchema);

// === GET - Smart Plug állapot lekérése ===
app.get('/api/smartplug', async (req, res) => {
  try {
    let state = await WifiState.findOne();
    if (!state) {
      state = new WifiState({ state: 'off' });
      await state.save();
    }
    res.json({ isOn: state.state === 'on' });
  } catch (err) {
    console.error("❌ Hiba a GET /api/smartplug során:", err);
    res.status(500).json({ message: 'Szerverhiba' });
  }
});

// === POST - Smart Plug állapot beállítása ===
app.post('/api/smartplug', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Nincs jogosultság' });
  }

  const { isOn } = req.body;
  const newState = isOn ? 'on' : 'off';

  try {
    let state = await WifiState.findOne();
    if (!state) {
      state = new WifiState({ state: newState });
    } else {
      state.state = newState;
    }
    await state.save();
    console.log(`✅ Smart plug állapota mentve: ${newState}`);
    res.json({ success: true, isOn });
  } catch (err) {
    console.error("❌ Hiba a POST /api/smartplug során:", err);
    res.status(500).json({ message: 'Szerverhiba' });
  }
});

// === Szerver indítása ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Szerver fut: http://localhost:${PORT} vagy Renderen`);
});
