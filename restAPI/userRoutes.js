'use strict';

var express         = require('express');
var bodyParser      = require('body-parser');
var router          = express.Router();
var sha1            = require('sha1');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({
    extended: false
}));

//stub of data;
// should be replace by a real database
var userDbStub = [
    { 
       id:'1',
       firstName:'john',
       lastName: 'doe',
       emailAddress : 'john.doe@mail.com',
       password: 'password',  // should have to be in shaone
       headline : '',
       industry : '',
       pictureUrl : '',
       positions: [],
       specialties:'',
       contacts:[{
           id:'2'
       }],
       place : []    
    },
    {
       id:'2',
       firstName :'barb',
       lastName : 'dirt',
       emailAddress : 'barb.dirt@mail.com',
       password : 'password', // should have to be in shaone
       headline : '',
       industry : '',
       pictureUrl : '',
       positions: [],
       specialties:'',
       contacts:[],
       place : []    
    }
]
/**
 * ======= functions utilities =============================
 */

/**
 * function message and http status handling
 * @return error object 
 */
function error(message,status) {
    var err = new Error(message);
    err.status;    
    return err;
}



/**
 * function to retrieve user in userStub by its id
 * @param id of the user , res the response request
 * @return user  object
 */
function getUser(id,res) {
     var user;
     if ( id && id !== '' )  {
        userDbStub.forEach(function(element) {
            if(element.id === id ) {
                user = element;
            }
        }, this); 
                    
        if( !user ) {
            res.status(404).send('user not found');
        }
    
    } else {
       res.status(400).send('id isn\'t defined');       
    }    
    return user;
}

/**
 *function to update user if a body parameter is set 
 * @return user object updated 
 */

function updateUser(userFound,reqBody) {
    var userIndex = userDbStub.lastIndexOf(userFound);
    
    if (reqBody) {
        
       for (var params in reqBody) {
           // we avoid to insert non existing property and avoir the modification of the id and password that it's forbbiden
            if( params && params !== '' && userFound[params] !== undefined && params !== 'id' && params !== 'password' ) {
                userFound[params] = reqBody[params];
            }
        }        
        userDbStub[userIndex] = userFound;    
    }
    return userFound;
}

/**
 * function to create user with required params if exist
 * @return new user object
 */
function createUser(reqBody){
    var user={};
    //we take the first occurence to have the data model 
    var model = userDbStub[0];
     console.log(reqBody);
    if (reqBody){
        for (var params in model) {
            
             
            if (reqBody[params] !== undefined) {
                if(params === 'password') {
                    user[params] = sha1(reqBody[params]);
                }else{
                    user[params] = reqBody[params];
                }              
            }else if(Number.isInteger(model[params])) {
                user[params]=0;
            }else if(Array.isArray(model[params])){
                user[params]=[];
            }else{
                user[params]= '';
            }
        }      
      userDbStub.push(user);   
    }
    console.log(user);
    return user ;
}

/**
 * function to update user password
 */

function updatePassword(user,password) {
      var userIndex = userDbStub.lastIndexOf(user);

      if (password !== '' && password !== undefined) {
          user.password = sha1(password);
          userDbStub[userIndex] = user;
      }
      
      return user;
}

/**
 * function to check if user already contain a user 
 */

function contactExist(user,userToCheck) {
  var exist = false;
    user.contacts.forEach(function(contactId) {
        if (( contactId.id !== undefined &&  userToCheck.id !== undefined)  && contactId.id === userToCheck.id) {
            exist = true;
        }
    }, this);
    
    return exist;
} 

/**
 * function to delete contact from user 
 */
function deleteContact(user,contactId) {
    var userObject = {id:contactId.id}
    var contactindex = user.contacts.lastIndexOf(userObject);
    if(contactindex){
      user.contacts.splice(contactindex,1);     
    }
    return user;
}

/**
 * function to get a user by its email for the authentification
 */

function getAuthUser(req,res){
    var email = req.body.email;
    var userAuth = {};
    
    if(email && email !== '' && email !== undefined) {
        userDbStub.forEach(function(user) {
            if(user.emailAddress === email) {
               userAuth = user;
            }      
     }, this);
    }else{
        res.status(401).send('authenfication fail');
    }
    return userAuth;   
}
    


/**
 * ======= all routes for the user =============================
 */

/**
 * get function to retrieve all users from the database
 */
router.get('/', function(req,res,next) {
    res.json(userDbStub);
})

/**
 * get function to retrieve one user by its id
 */
.get('/:id', function(req,res,next) {
     var user = getUser(req.params.id,res);
     res.json(user);
})

/**
 * get function to get all contacts from a user 
 */
.get('/:id/contacts/',function(req,res,next){
    var user = getUser(req.params.id);
    res.json(user.contacts);
})

/**
 * get function to get a user by its id that is in contact list from a user id 
 */
.get('/:id/contact/:contactId',function(req,res,next){
    var user = getUser(req.params.id)
    var contact={};
     user.contacts.forEach(function(contactId) {
         if(contactId.id == req.params.contactId){
             contact = getUser(contactId.id,res);
         }
     }, this);
     res.json(contact);
})
/**
 * function to authenticate user 
 */
.post('/authenticate',function(req,res,next) {
    var user = getAuthUser(req,res);
    
    if (user && JSON.stringify(user) !== '{}' && user.password === sha1(req.body.password)) {
        res.json(user);
    } else {
        res.status(401).send('authentication error');
    }
      
})
/**
 * post function to update user informations
 */
.post('/:id', function(req,res,next) {
    var user = getUser(req.params.id,res);
    user =  updateUser(user,req.body);
    res.json(user); 
})

/**
 * post function to update password user 
 */
.post('/:id/pass', function(req,res,next){
    
    var user = getUser(req.params.id,res);
    var newPass = req.body.password;
    user =  updatePassword(user,newPass);
    res.json(user);             
})

/**
 * post function to adding a contact in the list 
 * 
 */
.post('/:id/contact/', function(req,res,next){
     var id = req.params.id;
     var idToAdd = req.body.id;
     var user;
     var userToAdd;
     
     if( id !== idToAdd) {
         user = getUser(id,res);
         userToAdd = getUser(idToAdd,res);
         
         //we check if the user doesn't already have userToAdd 
         if (!contactExist(user,userToAdd)) {
             user.contacts.push({id : userToAdd.id});
         }
         res.json(user);      
     }else{
         res.status(400).send('the user can\'t add itself as contact');
     }                     
})
/**
 * put function to create a user 
 * 
 * we start to check if there is an existing user 
 * otherwise we create him in the database
 */
.put('/', function(req,res,next) {
     
    var reqBody = req.body;
    var id = reqBody.id;
    var user = {};
    console.log(reqBody);
    
    if ( id && id !== '') {
        console.log("id passe");
       //we check get the user if exist       
       userDbStub.forEach(function(dbUser) {
           if (dbUser.id === id) {
               user = dbUser;
           }
       }, this);

        if ( !user || JSON.stringify(user) === '{}') {//we create the user
            console.log("user non existante");
           // check the parameters and put in the db.
            var created = createUser(reqBody);
            if( created  && JSON.stringify(created) !== '{}' ) {
                res.send(created);
            }else{
                res.status(504).send('user creation issue');
            }
        } else { // we update the user
           user = updateUser(user,reqBody);
           res.json(user);
       }
       
    } else {
       res.status(400).send('id isn\'t defined');
    }
})

/**
 * function to delete a user by its id
 */
.delete('/:id', function(req,res,next){
    var user = getUser(req.params.id,res);
    user = userDbStub.splice(userDbStub.lastIndexOf(user),1);
    res.json(user);
})
/**
 * function to delete a contact from a user 
 */
.delete('/:id/contact/:contactId',function(req,res,next){
     var user = getUser(req.params.id,res);
     var userToDel = getUser(req.params.contactId);
    
    if(contactExist(user,userToDel)){
        user = deleteContact(user,userToDel);    
    }
    res.json(user);
});
module.exports = router;