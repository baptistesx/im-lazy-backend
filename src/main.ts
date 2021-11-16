require("dotenv").config();

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
var cors = require("cors");

// Functions
const startBrowserAndLogin = require("./functions").startBrowserAndLogin;
const setSearchCityParams = require("./functions").setSearchCityParams;
const setSearchAdditionnalParams =
  require("./functions").setSearchAdditionnalParams;
const setMessages = require("./functions").setMessages;
const scrapAndMessageMembers = require("./functions").scrapAndMessageMembers;
const startBot = require("./functions").startBot;

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());

// parse application/json
app.use(bodyParser.json());

// app.post("/botParams", function (req, res) {
//   console.log(req.body);
//   res.send("test ok");
// });

// app.post("/startBot", function (req, res) {
//   console.log(req.body)
//   // var user_name = req.body.user;
//   // var password = req.body.password;
//   // console.log("User name = " + user_name + ", password is " + password);
//   res.end("yes");
// });
// app.post('/botParams',function(req,res){
//   var user_name = req.body.user;
//   var password = req.body.password;
//   console.log("User name = "+user_name+", password is "+password);
//   res.end("yes");
//   });

app.get("/startBrowserAndLogin", startBrowserAndLogin);

app.get("/setSearchCityParams", setSearchCityParams);

app.get("/setSearchAdditionnalParams", setSearchAdditionnalParams);

app.get("/setMessages", setMessages);

app.get("/scrapAndMessageMembers", scrapAndMessageMembers);

app.post("/startBot", startBot);

app.listen(4999);
