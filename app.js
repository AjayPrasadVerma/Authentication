require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const encrypt = require('mongoose-encryption');
const bcrypt = require("bcrypt");
const saltRounds = 10;

const path = require('path');

const staticPath = path.join(__dirname,"./public");

app.use(express.static(staticPath));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended : true}));

mongoose.connect("mongodb://127.0.0.1:27017/ajay")
.catch((e)=>{
    console.log(e);
})

const userSchema = new mongoose.Schema({
    email : String,
    password : String
});

const User = mongoose.model('Registered_user',userSchema);

app.get("/",(req,res)=>{
    res.render('home');
})

app.get("/login",(req,res)=>{
    res.render('login');
});

app.get("/register",(req,res)=>{
    res.render('register');
});


app.post("/register", async (req,res)=>{

    bcrypt.hash(req.body.password , saltRounds, async function(err, hash){

        const newUser = await new User({
            email : req.body.username,
            password : hash
        });
    
        await newUser.save()
        .then(()=>{
            console.log("Successfully added........");
        }).catch((err)=>{
            console.log(err);
        })
        res.render('secrets');

    });
});

app.post("/login", async (req,res)=>{

    const username = req.body.username;
    const password = req.body.password;

    const foundUser = await User.findOne({email : username});

    if(foundUser){
        
        bcrypt.compare(password, foundUser.password, function(err,result){
            if(result === true){
                res.render('secrets');
            }
        })
    }
    else{
        console.log("No Data Found");
    }
});

app.listen(4000, ()=>{
    console.log("Server started on port number 4000");
})

//During save, documents are encrypted and then signed. During find, documents are authenticated and then decrypted