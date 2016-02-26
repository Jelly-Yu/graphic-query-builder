var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var uuidGenerator = require('node-uuid');
const KEYSPACE_NAME = '';

console.log('Initializing Cassandra connection...');
var cassandra = require('cassandra-driver');
var cassandraClient = new cassandra.Client({ contactPoints: [''], keyspace: ''});
cassandraClient.connect(function(err, result){
	if(err){
		cassandraClient.shutdown();
    	return console.error('There was an error when connecting', err);
	}else{
		console.log('connected');
	}
})
console.log('Initialized Cassandra connection.');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//solve CORS problem
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.header('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');

    // Request headers you wish to allow
    res.header('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Pass to next layer of middleware
    next();
});

process.on('uncaughtException', function(err) {
	console.log('Unhandled Exception: ', err);
});

const SERVER_LISTENING_PORT = 1500;
var server = app.listen(SERVER_LISTENING_PORT, function(){
	var host = server.address().address;
	var port = server.address().port;
	console.log('server listening at http://%s:%s', host, port)
	//console.log("Web-BigData-Manager server listening on port " + SERVER_LISTENING_PORT + "...");

})

var getTables = 'SELECT columnfamily_name FROM system.schema_columnfamilies WHERE keyspace_name =\''+KEYSPACE_NAME +'\''; 
app.get('/tables', function(req,res){
	cassandraClient.execute(getTables, {prepare : true} ,function(err, result){
		if(err){
			res.status(404).send({msg: err});

		}else{
			console.log('Obtained table data:', result.rows);
			res.send(result.rows,200);
		}
	})

});

var getColumns = 'SELECT column_name FROM system.schema_columns WHERE columnfamily_name = ? ALLOW FILTERING'

app.get('/tables/:columns', function(req,res){
	cassandraClient.execute(getColumns,[req.query.table], {prepare : true}, function(err, result){
		if(err){
			res.status(404).send({msg: err});

		}else{
			console.log('Obtained column data:', result.rows);
			res.send(result.rows,200);
		}
	})
});

app.get('/metadata/:description', function(req,res){
	cassandraClient.metadata.getTable(KEYSPACE_NAME, [req.query.table],  {prepare : true},function(err, tableInfo){
		if(err){
			console.error('There was error while trying to retrieve description of table');
			res.status(404).send({msg:err});
			
		}else{
			console.log('Obtained table description:', tableInfo.partitionKeys);
			res.send(tableInfo.partitionKeys, 200);
		}
	});
});

app.post('/search', function(req,res){
	var querystatement = req.body.qStr;
	console.log("Query statement posted:" + querystatement);
	cassandraClient.execute(querystatement, {prepare : true, traceQuery:true}, function(err, result){		
		if(err){
			cassandraClient.on('error', function(level, className, message, furtherInfo) {
			console.log('error event: %s -- %s', level, message);
		});
			res.status(400).send({msg: err});
			cassandraClient.shutdown();
			return console.error('There was error while trying to retrieve data from keyspace: ', err);

		}else{
			cassandraClient.on('log', function(level, className, message, furtherInfo) {
			console.log('log event: %s -- %s', level, message);
		});
			console.log('Obtained row:', result.rows);
			res.send(result.rows,200);
		}
	})

});