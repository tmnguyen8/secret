require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
// const { nextTick } = require("process");
const GoogleStrategy = require('passport-google-oauth20').Strategy; // Level 6
const findOrCreate = require("mongoose-findorcreate");
// const encrypt = require("mongoose-encryption"); // Level 2
// const md5 = require("md5"); // Level 3
// const bcrypt = require("bcrypt"); // Level 4
// const saltRounds = 10; // rounds of hashing for bcrypt

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Determine whether it is localhost or mongoDB server
if (port === 3000) {
    mongooseConnection = `mongodb://localhost:27017/${process.env.DATABASE}`;
} else {
    mongooseConnection = process.env.MONGOOSE_CONNECTION + database;
}

// Mongoose connection to DB
mongoose.connect(mongooseConnection, {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);

// User Schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  (accessToken, refreshToken, profile, cb) => {
        // console.log(profile);

        User.findOrCreate({ googleId: profile.id }, (err, user) => {
        return cb(err, user);
        });
  }
));


app.get("/", (req,res) => {
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] })
);

app.get("/auth/google/secrets", 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    }
);

app.get("/login", (req,res) => {
    res.render("login");
});

app.get("/register", (req,res) => {
    res.render("register");
});

app.get("/secrets", (req, res) => {
    User.find({"secret": {$ne: null}}, (err, foundUser) => {
        if (err) {
            console.log(err)
        } else {
            if (foundUser) {
                res.render("secrets", {userWithSecrets: foundUser})
            }
        }
    })
});

app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;

    // console.log(req.user._id);

    User.findById(req.user._id, (err, foundUser) => {
        if(err) {
            console.log(err);
        } else {
            if(foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(()=> {
                    res.redirect("/secrets")
                });
            }
        }
    });
});

app.post("/register", (req, res) => {
    User.register({username: req.body.username}, req.body.password, (err, registeredUser) => {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, ()=> {
                res.redirect("/secrets");
            })
        }
    })
});

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, (err) => {
        if (err) {
            return next(err);
        } else {
            passport.authenticate("local")(req, res, ()=> {
                res.redirect("/secrets");
            })
        }
    });
});

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
})


app.listen(port, ()=> console.log(`Server started on port ${port}.`));