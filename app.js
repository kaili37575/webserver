var express =require('express')
, stylus = require('stylus')
, nib = require('nib');

var JDBC = require('jdbc');

var jinst = require('jdbc/lib/jinst');
 
if (!jinst.isJvmCreated()) {
  jinst.addOption("-Xrs");
  jinst.setupClasspath(['./drivers/hsqldb.jar',
                        './drivers/derby.jar',
                        './drivers/derbyclient.jar',
                        './drivers/derbytools.jar']);
}

var config = {
  url: 'jdbc:phoenix:sl1:2181:/hbase-unsecure',
  libpath: '/usr/hdp/current/phoenix-client/phoenix-client.jar',
  drivername: 'org.apache.phoenix.jdbc.PhoenixDriver'
}

var hsqldb = new JDBC(config);
//Initialize jdbc object
hsqldb.initialize(config, function(err, res){ if (err){ console.log(err); } });


var asyncjs = require('async');
 
hsqldb.reserve(function(err, connObj) {
  // The connection returned from the pool is an object with two fields 
  // {uuid: <uuid>, conn: <Connection>} 
  if (connObj) {
    console.log("Using connection: " + connObj.uuid);
    // Grab the Connection for use. 
    var conn = connObj.conn;
 
    // Query the database. 
    asyncjs.series([
      function(callback) {
        // Select statement example. 
        conn.createStatement(function(err, statement) {
          if (err) {
            callback(err);
          } else {
            // Adjust some statement options before use.  See statement.js for 
            // a full listing of supported options. 
            statement.setFetchSize(100, function(err) {
              if (err) {
                callback(err);
              } else {
                statement.executeQuery("SELECT * FROM scoring_detailpage;",
                                       function(err, resultset) {
                  if (err) {
                    callback(err)
                  } else {
                    resultset.toObjArray(function(err, results) {
                      if (results.length > 0) {
                        var data_score=results;
                      }
                      callback(null, resultset);
                    });
                  }
                });
              }
            });
          }
        });
      }
    ], function(err, results) {
      // Results can also be processed here. 
      // Release the connection back to the pool. 
      hsqldb.release(connObj, function(err) {
        if (err) {
          console.log(err.message);
        }
      });
    });
  }
});

var app = express()
function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');
app.use(stylus.middleware(
  { src: __dirname + '/public'
  , compile: compile
  }
));
app.use(express.static(__dirname + '/public'))
app.get('/', function (req, res) {
  res.render('index',
  { data : data_score });
})
app.listen(8888);

console.log('Server running at http://127.0.0.1:8888/');
