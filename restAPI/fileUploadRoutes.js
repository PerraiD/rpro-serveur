'use strict';

var request      = require('request');
var express     = require('express');
var bodyParser  = require('body-parser');
var fs = require('fs');
var multer  = require('multer');
var dest = process.env.OPENSHIFT_DATA_DIR !== undefined ? process.env.OPENSHIFT_DATA_DIR : './spec/uploadFilesSpec/'
var upload = multer({dest: dest});
var router      = express.Router();
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({
    extended: false
}));

var transfertDb = require('../database/transfertDb');

/**
 * definition of the request for pushnotification
 * 
 */
function setPushNotification(tokendevice,title,message,data) {
    
    // Define relevant info
    var jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhYjA0MDJhYS1hYTkyLTRiNTMtOTQwNS1hMzg3ODE2YjZlYjEifQ.a18d3wuYXKWdxutsydP4RVJ3-NJZS4BXjMnv8_psSAI';
    var profile = 'rpro';

    // Build the request object
    var options = {
        method: 'POST',
        url: 'https://api.ionic.io/push/notifications',
        json: true,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + jwt
        },
        body :{
            "tokens": tokendevice,
            "profile": profile,
            "notification": {
                "title": title,
                "message": message,
                "payload": data,
                "android": {
                    "title": title,
                    "message": message,
                    "delay_while_idle": true,
                    "priority":"high",
                },
                "ios": {
                    "content_available": 1,
                     "title": title,
                     "message": message,
                }
            }
        }
    };
    
   return options;      
}

router.post('/upload/file',upload.single('file'),function(req,res,next){
    
    if(req.file !== undefined && req.file.path !== undefined) {
        var usersToPrevent = JSON.parse(req.body.users);
        var sender = req.body.sender;
        
        var filename = req.file.originalname;
        fs.readFile(req.file.path, function (err, data) {
            if(err) {
                res.send(500).send(err);
            }
            var filePath = process.env.OPENSHIFT_DATA_DIR !== undefined ?  process.env.OPENSHIFT_DATA_DIR + filename : __dirname +'/'+filename;
            var url = "https://rpro-epic2.rhcloud.com/fileupload/"+filename;
            
            fs.writeFile(filePath, data, function (err) {
                if(err){
                    res.status(403).send(err);
                }else{
                    var usersTokenDevice = [];
                    usersToPrevent.forEach(function(user) {
                        if(user.tokenDevice !== ''){
                            usersTokenDevice.push(user.tokenDevice);
                        }                        
                    }, this);
                    
                    //We store the transfert proposition
                    transfertDb.push({'dlink':url,'sender':sender,'usersTokens':usersTokenDevice});
                                                        
                    res.status(200).send("ok");    
                }                
            });
        });
        
    }else{
        res.status(400).send('file not uploaded');
    }
})
.post('/allowtransfer/',function(req,res,next){
    
      if(transfertDb.length > 0) {
                
        var transfert = transfertDb.pop();
        var filename = transfert.dlink.split('/').pop();
       
        var notificationBody = {
                    "type": "dlink",
                    "sender":transfert.sender,
                    "dlink": transfert.dlink
            }
        var tokens = transfert.usersTokens;
        
        if(tokens.length == 0) {
            res.status(500).send('tokens array is empty');
        }else{
                   
            var notifRequest = setPushNotification(tokens,'HUB de partage','Proposition de transfert de fichier : '+filename, notificationBody);
            // we create a request to send the push notification to google cloud message server 
            request(notifRequest, function (err, response, body) {
                if (err) {
                    res.status(500).send(err);
                }   
                    res.send('ok').end();
            });
          }
      } else {
          res.status(400).send('no waiting download');
      }    
})
//TODO : DELETE IT IN PRODUCTION 
// function to get all the data from transferdb
.get('/transfers/',function(req,res,next){
    res.json(transfertDb);
})

.get('/:filename', function(req,res,next) {
    var filename = req.params.filename;
    res.sendFile(dest+filename); 
});

module.exports = router;