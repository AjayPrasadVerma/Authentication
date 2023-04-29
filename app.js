require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const passport = require('passport');
const session = require('express-session');
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const path = require('path');

const staticPath = path.join(__dirname, "./public");

app.use(express.static(staticPath));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
// app.use(passport.authentication('session'));

mongoose.connect("mongodb://127.0.0.1:27017/ajay")
    .catch((e) => {
        console.log(e);
    })

const userSchema = new mongoose.Schema({
    displayName: String,
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('Registered_user', userSchema);

passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, {
            id: user.id,
            username: user.username,
            picture: user.picture
        });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy(
    {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:4000/auth/google/secrets"
    },
    async function (accessToken, refreshToken, profile, cb) {

        try {
            // console.log(profile);
            const user = await User.findOne({ googleId: profile.id });

            if (!user) {
                const newUser = new User({
                    displayName: profile.displayName,
                    googleId: profile.id
                });

                await newUser.save();
            }

            return cb(null, user);
        } catch (err) {
            return cb(err);
        }
    }
));

app.get("/", (req, res) => {
    res.render('home');
})

app.get("/auth/google",

    passport.authenticate("google", { scope: ["profile"] })

);

app.get("/auth/google/secrets",
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect secrets.
        res.redirect("/secrets");
    });

app.get("/login", (req, res) => {
    res.render('login');
});

app.get("/register", (req, res) => {
    res.render('register');
});

app.post("/register", async (req, res) => {

    // register() is a method comes from passport-local-mongoose
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }
    })

});

app.get("/secrets", async (req, res) => {

    const foundUsers = await User.find({ secret: { $ne: null } });
    if (foundUsers) {
        res.render("secrets", { usersWithSecrets: foundUsers })
    }
})

app.post("/login", async (req, res) => {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    // login() comes from passport
    req.logIn(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }
    });
});

app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render('submit');
    } else {
        res.redirect('/login');
    }
});

app.post('/submit', async (req, res) => {
    const submitSecret = req.body.secret;

    const addedSecret = await User.updateOne({ _id: req.user.id }, { $set: { secret: submitSecret } }, { multi: true });
    if (addedSecret) {
        res.redirect("/secrets");
    } else {
        console.log(addedSecret)
    }
});

app.get("/logout", (req, res) => {

    req.logout(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect('/');
        }
    });
});

app.listen(4000, () => {
    console.log("Server started on port number 4000");
})

//During save, documents are encrypted and then signed. During find, documents are authenticated and then decrypted