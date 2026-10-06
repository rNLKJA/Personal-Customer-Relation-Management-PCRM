require('dotenv').config()    // for JWT password key

// used to create our local strategy for authenticating
// using username and password
const LocalStrategy = require('passport-local').Strategy;

// our user model
const { User } = require('../models/userSchema');

// the following is required if you wanted to use passport-jwt
// JSON Web Tokens
const passportJWT = require("passport-jwt");
const JwtStrategy = passportJWT.Strategy;
const ExtractJwt = passportJWT.ExtractJwt;
const cookieExtractor = function (req) {
    let token = null;
    if (req && req.cookies) {
        token = req.cookies['jwt'];
    }
    if (token == null) {
        console.log("token not found")
    }
    
    return token;
};

module.exports = function(passport) {

    let opts = {}

    opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
    opts.secretOrKey = process.env.PASSPORT_KEY

    // these two functions are used by passport to store information
    // in and retrieve data from sessions. We are using user's object id
    passport.serializeUser(function(user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function(_id, done) {
        User.findById(_id, function(err, user) {
            done(err, user);
        });
    });


    // strategy to login
    // this method only takes in username and password, and the field names
    // should match of those in the login form
    passport.use('local-login', new LocalStrategy({
            usernameField : 'userName', 
            passwordField : 'password',
            passReqToCallback : true}, // pass the req as the first arg to the callback for verification 
        function(req, userName, password, done) {
            
            // you can read more about the nextTick() function here: 
            // https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/
            // we are using it because without it the User.findOne does not work,
            // so it's part of the 'syntax'
            process.nextTick(function() {
                // see if the user with the email exists
                User.findOne({ 'userName' :  userName }, function(err, user) {
                    // if there are errors, user is not found or password
                    // does match, send back errors
                    if (err){
                        return done(err);}
                    if (!user){
                        console.log("user not found local")
                        return done(null, false, "user not found");
                    }

                    if (!user.validPassword(password)){
                        // false in done() indicates to the strategy that authentication has
                        // failed
                        return done(null, false, "password is incorrect");
                    }
                    // otherwise, we put the user's email in the session
                    else {
                        
                        console.log("login successful")
                        return done(null, user,'Login successful');
                    }
                });
            });

        }));


    // depending on what data you store in your token, setup a strategy
    // to verify that the token is valid. This strategy is used to check
    // that the client has a valid token
    passport.use('jwt', new JwtStrategy(opts,(jwt_payload, done) => { 

        console.log("user is " + jwt_payload.body._id)
        User.findOne({'userName':jwt_payload.body._id}, (err, user) => {

            if(err){
                return done(err, false);
            }
            // if we found user, provide the user instance to passport    
            if(user){
                console.log("jwt auth successful")
                return done(null, user);
            } else { // otherwise assign false to indicate that authentication failed
                return done(null, false);
            }
        });
    }));
};
