// app.js
//Programmer Robin Schlenker
//This program is a sample application to use the mongodb-lab service on IBM Bluemix
//for questions and ideas, please contact me via: robin.schlenker@web.de
var bodyParser = require('body-parser');	//to communicate with ejs file
var express = require('express');
var mongoClient = require('mongodb').MongoClient;	//mongodb module
var firstname, lastname; //variables to insert in the db 
var db = 'mongodb://<DB USER>:<DB PW>@ds055200.mongolab.com:55200/IbmCloud_g02pec2h_2u1gk56e/exampledb';	//db address with user data
/* setup middleware */
var app = express();
app.use(express.static(__dirname + '/public')); //setup static public directory
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views'); //optional since express defaults to CWD/views
//needed to use app.post 	!Very Important!;
app.use(bodyParser.urlencoded({   
  extended: true
}));    

// render index page
app.get('/', function(req, res){
	res.render('index', {names: [], title: '', plc1: '', plc2: '', hide: 'none' });	//parameters for ejs file
});

//render adduser page
app.get('/adduser', function(req, res){
	res.render('adduser', {title: '', hide: 'none'});
});

/*Add new user*/
app.post('/addentry', function(req, res) {
	firstname=req.body.firstname;	//get form values	
	lastname=req.body.lastname;

	/*insert into db*/	

	mongoClient.connect(db, function(err, db) {		//connect to db
		if (err) console.log('Failed to connect');
		db.createCollection('names', {w:1}, function(err, collection) {		//create collection if not already created
			if (err) console.log('Failed to create Collection');
			var collection = db.collection('names');			
			var docs = {'firstname':firstname, 'lastname':lastname}; //create and insert object with names from html form
			collection.find().toArray(function(err, items){ //Search through existing user
				if(err)console.log('Failed to find anything');
				var isAlreadyInDb = true;	
				var userlist = [];
				for (i=0; i<=items.length; i++) {		//loop to read the properties of the db documents
					if (items.length == 0) {	//if no document is given insert names
						collection.insert(docs, {w:1}, function(err, result) {	//uses property of collection to insert docs to db
							if (!err) {		
								console.log(firstname + ' ' + lastname + ' was added');
							};
						});
						continue;
					}else {
						if (items.length == i){break;} 							
						if (items[i].firstname == firstname && items[i].lastname == lastname) {		//if name es already in DB 				
							console.log(firstname + ' ' + lastname + ' is already in the DB');
							isAlreadyInDb = true;
							break;
						} else {
							isAlreadyInDb = false;	//if user is the first entry and there is no user with the same values than he is not in the db for the moment
							continue;
						};
					};
				};	//end of for-loop
				if (!isAlreadyInDb) {		//insert if name wasn't found in db
					collection.insert(docs, {w:1}, function(err, result) {
						var text;
						if (!err) {
							console.log(firstname + ' ' + lastname + ' was added');
							text = "There are now " + (items.length + 1) + " User, including: " + firstname + ' ' + lastname; //response for the status bar in ejs file
							res.render('adduser', {title: text, hide: 'inline'});   			
						};   
					});
				}else {
					if(items.length>0) {	//proof if it was the first user inserted
					text = "There are now " + items.length + " User, including: " + firstname + ' ' + lastname; //response
					res.render('adduser', {title: text, hide: 'inline'});  
					} else {
					text = "There is now " + 1 + " User, it is: " + firstname + ' ' + lastname; //response
					res.render('adduser', {title: text, hide: 'inline'});  						
				};
				};				     		
			}); 

		});
	});
});
	
	/*improved search*/
app.post('/search', function(req, res) {
	firstname=req.body.firstname;	//get form values
	lastname=req.body.lastname;
	console.log('Searching for:\t' + firstname + ' ' + lastname);
	mongoClient.connect(db, function(err, db) {	//connect to db
		if (err) {console.log('Failed to connect')};
		db.createCollection('names', {w:1}, function(err, collection) { 	//create collection if not already created
			if (err) console.log('Failed to create Collection');
			var collection = db.collection('names');			
			var index;
			collection.findOne({'firstname':firstname}, function(err, item) {	//search for firstname
				if(!err) {
					if(item != null) {
						if(item.lastname == lastname) {		//if lastname and firstname is the same as requested
							console.log("Found: " + item.firstname + ' ' + item.lastname);
							index = "There is a user called " + firstname + ' ' + lastname;
							res.render('index', {names: [], title: index, plc1: firstname, plc2: lastname,hide: "inline" });	//render index with e.g. name-parameters
						} else {			//if only first name approved				
							collection.findOne({'lastname':lastname}, function(err, name) {		//search for lastname to ignore the same firstname
								if (!err) {
									if(name != null) {
										if (name.firstname == firstname) {	//if the firstname was twice in the db, the function found the user nevertheless
											console.log('Found (through lastname): ' + name.firstname + ' ' + name.lastname);
											index = "There is a user called " + firstname + ' ' + name.lastname;
											res.render('index', {names: [], title: index, plc1: firstname, plc2: lastname, hide: "inline" }); //render index
										} else {		//if the lastname was in the db but no matching firstname AND an existing entry with the same firstname
											index = "There is a user called " + firstname + " and there is one called " + lastname + 
													" but there is no " + firstname + ' ' + lastname + '!'; 
											res.render('index', {names: [], title: index, plc1: firstname, plc2: lastname, hide: "inline" });	//render index
										};
									} else {	//if no matching lastname was found and no other entry with this lastname is in the db
										index = "There is a user called " + firstname + ', but his lastname is not: ' + lastname;
										res.render('index', {names: [], title: index, plc1: firstname, plc2: lastname, hide: "inline" });	//render index
									};
								};
							});
						};						
					}else {		//if the firstname is not on the list, proof if the lastname is there 		
						collection.findOne({'lastname':lastname}, function(err, item) {
							if(!err){
								if (item != null) {
									if (item.lastname == lastname) {	//if db contains lastname but NOT firstname
										index="There is a user called " + lastname + ', but his firstname is not: ' + firstname;
										res.render('index', {names: [], title: index, plc1: firstname, plc2: lastname, hide: "inline" });	//render index
									};
								}else {	//if there was neither firstname nor lastname found
									console.log("No Entry found, at least the firstname is wrong!");
									index = firstname + ' ' + lastname + ' is not a User';
									res.render('index', {names: [], title: index, plc1: firstname, plc2: lastname, hide: "inline" });	//render index
								};
							};
						});	
					};
				};
			});
		});
	});
});

/*Show User*/
app.post('/showuser', function(req, res) {
	mongoClient.connect(db, function(err, db) {		//connect to db
		if (err) console.log('Failed to connect');
		db.createCollection('names', {w:1}, function(err, collection) {	//create collection if not already created
				if (err) console.log('Failed to create Collection');
			var collection = db.collection('names');
			collection.find().toArray(function(err, items){ //Search for available documents in db
				if(err)console.log('Failed to find anything');
				var userlist = [];
				for (i=0; i<=items.length; i++) {		//loop to read the properties of the db documents
					if (items.length == 0) {	
						userlist[i]="";
					}					
				};		//2 for loops because properties of items would be undefined with only one loop
				for (i=0; i<items.length;i++) {
					userlist[i] = items[i].firstname + ' ' + items[i].lastname;	//fill parameter-array for ejs file
				}
				var text = "There are " + items.length + " User";
				res.render('index', {names: userlist, title: text, plc1: '', plc2: '', hide: "inline"  });   //render index 
				console.log('All user displayed');		
			}); 

		});
	});
});

/*Delete data*/
app.post('/delete', function(req, res) {
	mongoClient.connect(db, function(err, db) { //connect to db
		if (err) console.log('Failed to connect');	
		db.createCollection('names', {w:1}, function(err, collection) {	 //create collection if not already created		
				if (err) console.log('Failed to create Collection');
			var collection = db.collection('names');
			collection.remove({}, function(err, result) {});	//remove data from db					
			res.render('index', {names: [], title: 'All data erased from the db', plc1: '', plc2: '', hide: "inline"  });	//render index
		});
		if(!err) {console.log('All data was removed')}
	});
});

var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}");
var services = JSON.parse(process.env.VCAP_SERVICES || "{}");

var host = (process.env.VCAP_APP_HOST || 'localhost');
// The port on the DEA for communication with the application:
var port = (process.env.VCAP_APP_PORT || 3000);
// Start server
app.listen(port, host);
console.log('App started on port ' + port);