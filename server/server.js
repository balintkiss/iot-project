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

// === CORS Beállítás ===
const corsOptions = {
  origin: 'https://balintkiss.github.io',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
};

app.use(cors(corsOptions)); // still recommended
app.options('*', cors(corsOptions)); // for preflight

// Manual override just in case
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://balintkiss.github.io');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

// === Middleware-ek ===
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'mySecretKey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: 'none',
    httpOnly: true
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// === MongoDB kapcsolat ===
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Kapcsolódva a MongoDB-hez"))
  .catch(err => console.error("❌ MongoDB hiba:", err));

// === Admin felhasználó ===
const adminUser = {
  id: 1,
  username: 'admin',
  passwordHash: '$2b$10$O5OYi9.flRBeifwhT5u5F.I1Eq4QFjXU4aDftZx.hdErPBpDnMgc2'
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
  // 🔑 Kényszerítjük a session frissítést, hogy garantáltan legyen Set-Cookie
  req.session.touch();

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://balintkiss.github.io');
  res.json({ message: 'Sikeres bejelentkezés', user: req.user });
});

// === Kijelentkezés ===
app.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ message: 'Hiba kijelentkezéskor' });
    res.clearCookie('connect.sid', { sameSite: 'none', secure: true });
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

// === Smart Plug állapot modell ===
const wifiSchema = new mongoose.Schema({
  state: { type: String, enum: ['on', 'off'], default: 'off' }
});
const WifiState = mongoose.model('WifiState', wifiSchema);

// === Smart Plug állapot lekérése ===
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

// === Smart Plug állapot mentése ===
app.post('/api/smartplug', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Nincs jogosultság' });
  }

  const { isOn } = req.body;
  if (typeof isOn !== 'boolean') {
    return res.status(400).json({ message: 'Hibás bemenet: isOn mezőnek boolean típusúnak kell lennie.' });
  }

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
