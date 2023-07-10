const express = require("express");
var router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const multer = require('multer')
const csv = require('fast-csv');
const cors = require("cors");
const fs = require('fs');
const Project = require('../models/project');
const middleware = require('../middleware/index1');
const { isAdmin } = require("../middleware/index1");



const fileStorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log("erore hereer")
        cb(null, "./csvfiles"); //important this is a direct path fron our current file to storage location
    },
    filename: (req, file, cb) => {
        cb(null, "test.csv");
    }
});

const upload = multer({ storage: fileStorageEngine });

router.get('/',isAdmin, function (req, res) {
    // res.send("hello")
    Project.find({}, function (err, allProjects) {
        if (err) {
            console.log(err);
        }
        else {
            res.render('admin/admin', { projects: allProjects })
        }
    })

});

router.post('/upload-csv',isAdmin, upload.single('file'), function (req, res) {

    var newCount = 0;
    var errorCount = 0;
    var pending = 0;
    const fileRows = [];
    csv.parseFile(req.file.path)
        .on("data", function (data) {
            fileRows.push(data); // push each row
        })
        .on("end", function () {
            console.log(fileRows) //contains array of arrays. Each inner array represents row of the csv file, with each element of it a column
            pending = fileRows.length; //check no of rows being processed
            fileRows.forEach(row => {
                if (row[0].toLowerCase() == "username") {
                    pending = pending -1;
                    return;
                } else {
                    var UserName = row[0];
                    var PassWord = row[1];
                    var aUser = row[2];
                    console.log(UserName, " ", PassWord, " ", aUser)
                    var newUser = new User({ username: UserName,user:aUser });
                    User.register(newUser, PassWord, function (err, user) {
                        if (err) {
                            errorCount++;
                            console.log(err);
                            console.log("error no:", errorCount)
                        } else {
                            newCount = newCount + 1;
                            console.log("\n new user created:", UserName)
                        }
                        if (pending == 1) { //check if last row is being handled, if yes render result
                            if (newCount > 0)
                                req.flash("success", "Succesfully added " + newCount + " new accounts")
                            if (errorCount > 0)
                                req.flash("error", "Unable to add ", errorCount, " accounts. Check for pre-exsiting accounts")
                            res.redirect('/admin');
                        }
                        pending--;//decrease pending rows
                    });
                    //process "fileRows" and respond
                }
            })
                    //the whole pending thing was done because User.register works asynchronously and allows other code to run before it finishes running, (multi threading)
            // fs.unlinkSync(req.file.path); // remove file after finish process
        })
});


router.post("/register",isAdmin, function (req, res) {
    var newUser = new User({ username: req.body.username, user: req.body.user});
    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.render("register", { error: err.message }); x
        } else {
            passport.authenticate("local")(req, res, function () {
                req.flash("success", "Welcome " + user.username + "!!!");
                res.redirect("/projects");
            });
        }
    });
});

router.put("/:id",isAdmin, function (req, res) {
    Project.findById(req.params.id, function (err, project) {
      project.reviewStatus = !project.reviewStatus;
      project.save(function (err, updatedproject) {
        if (err) {
          console.log(err);
        } else {
          res.redirect("/admin")
        }
      })
    })
  });


module.exports = router;