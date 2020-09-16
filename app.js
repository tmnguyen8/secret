require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));

// Define Database Name
const database = "userSecretDB";

// Determine whether it is localhost or mongoDB server
if (port === 3000) {
    mongooseConnection = `mongodb://localhost:27017/${database}`;
} else {
    mongooseConnection = process.env.MONGOOSE_CONNECTION + database;
}

// Mongoose connection to DB
mongoose.connect(mongooseConnection, {useNewUrlParser: true});

// User Schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(encrypt, {secret: process.env.ENCRYPTION, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);

app.get("/", (req,res) => {
    res.render("home");
});

app.get("/login", (req,res) => {
    res.render("login");
});

app.get("/register", (req,res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });

    newUser.save((err) => {
        if(err) {
            console.log(err);
        } else {
            res.render("secrets");
        }
    });
});

app.post("/login", (req, res) => {
    User.findOne({email: req.body.username}, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                if (foundUser.password === req.body.password) {
                    res.render("secrets");
                } else {
                    console.log("Password does not match");
                }
            } else {
                console.log("No user found, please try entering a different username")
            }
        }
    });
});


app.listen(port, ()=> console.log(`Server started on port ${port}.`));