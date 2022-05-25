var OpenVidu = require('openvidu-node-client').OpenVidu;
var OpenViduRole = require('openvidu-node-client').OpenViduRole;

// Recebe o URL do servidor OpenVidu e a senha
if (process.argv.length != 4) {
    console.log("Usage: node " + __filename + " OPENVIDU_URL OPENVIDU_SECRET");
    process.exit(-1);
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var express = require('express');

//const server = express();

var fs = require('fs');
var https = require('https');
var bodyParser = require('body-parser'); // Pull information from HTML POST (express4)
var app = express(); // Create our app with express



// Configuração do server
app.use(express.static(__dirname + '/public')); 
app.use(bodyParser.urlencoded({
    'extended': 'true'
}));
app.use(bodyParser.json()); 
app.use(bodyParser.json({
    type: 'application/vnd.api+json'
})); 


var options = {
    key: fs.readFileSync('openvidukey.pem'),
    cert: fs.readFileSync('openviducert.pem')
};
https.createServer(options, app).listen(3000);

// Environment variable: URL where our OpenVidu server is listening
var OPENVIDU_URL = process.argv[2];
// Environment variable: secret shared with our OpenVidu server
var OPENVIDU_SECRET = process.argv[3];

// Entrypoint to OpenVidu Node Client SDK
var OV = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);

// Collection to pair session names with OpenVidu Session objects
var mapSessions = {};
// Collection to pair session names with tokens
var mapSessionNamesTokens = {};

console.log("App listening on port 5000");




/* Session API */

// Pega o token da essao e coloca usuario dentro
app.post('/api/get-token', function (req, res) {
    // The video-call to connect
    var sessionName = req.body.sessionName;
    var User = req.body.User
    // Role associated to this user
    var role = OpenViduRole.PUBLISHER;

    console.log("Getting a token | {sessionName}={" + sessionName + "}");
    console.log("Nome: ", User)

    // Build connectionProperties object with PUBLISHER role
    var connectionProperties = {
        role: role
    }

    if (mapSessions[sessionName]) {
        // Quando a sessão já existe
        console.log('Existing session ' + sessionName);

        // Pega sessão existente 
        var mySession = mapSessions[sessionName];

        // Generate a new Connection asynchronously with the recently created connectionProperties
        mySession.createConnection(connectionProperties)
            .then(connection => {

                // Store the new token in the collection of tokens
                mapSessionNamesTokens[sessionName].push(connection.token);

                // Return the token to the client
                res.status(200).send({
                    0: connection.token
                });
            })
            .catch(error => {
                console.error(error);
                if (error.message === "404") {
                    delete mapSessions[sessionName];
                    delete mapSessionNamesTokens[sessionName];
                    newSession(sessionName, connectionProperties, res);
                }
            });
    } else {
        newSession(sessionName, connectionProperties, res);
    }
});

function newSession(sessionName, connectionProperties, res) {
    // New session
    console.log('New session ' + sessionName);

    // Create a new OpenVidu Session asynchronously
    OV.createSession()
        .then(session => {
            // Store the new Session in the collection of Sessions
            mapSessions[sessionName] = session;
            // Store a new empty array in the collection of tokens
            mapSessionNamesTokens[sessionName] = [];

            // Generate a new connection asynchronously with the recently created connectionProperties
            session.createConnection(connectionProperties)
                .then(connection => {

                    // Store the new token in the collection of tokens
                    mapSessionNamesTokens[sessionName].push(connection.token);

                    // Return the Token to the client
                    res.status(200).send({
                        0: connection.token
                    });
                })
                .catch(error => {
                    console.error(error);
                });
        })
        .catch(error => {
            console.error(error);
        });
}

// Remove usuario da sessão
app.post('/api/remove-user', function (req, res) {
    // Retrieve params from POST body
    var sessionName = req.body.sessionName;
    var token = req.body.token;
    console.log('Removing user | {sessionName, token}={' + sessionName + ', ' + token + '}');

    // If the session exists
    if (mapSessions[sessionName] && mapSessionNamesTokens[sessionName]) {
        var tokens = mapSessionNamesTokens[sessionName];
        var index = tokens.indexOf(token);

        // If the token exists
        if (index !== -1) {
            // Token removed
            tokens.splice(index, 1);
            console.log(sessionName + ': ' + tokens.toString());
        } else {
            var msg = 'Problems in the app server: the TOKEN wasn\'t valid';
            console.log(msg);
            res.status(500).send(msg);
        }
        if (tokens.length == 0) {
            // Last user left: session must be removed
            console.log(sessionName + ' empty!');
            delete mapSessions[sessionName];
        }
        res.status(200).send();
    } else {
        var msg = 'Problems in the app server: the SESSION does not exist';
        console.log(msg);
        res.status(500).send(msg);
    }
});

// Close session
app.delete('/api/close-session', function (req, res) {
    // Retrieve params from POST body
    var sessionName = req.body.sessionName;
    console.log("Closing session | {sessionName}=" + sessionName);

    // If the session exists
    if (mapSessions[sessionName]) {
        var session = mapSessions[sessionName];
        session.close();
        delete mapSessions[sessionName];
        delete mapSessionNamesTokens[sessionName];
        res.status(200).send();
    } else {
        var msg = 'Problems in the app server: the SESSION does not exist';
        console.log(msg);
        res.status(500).send(msg);
    }
});

// Fetch session info
app.post('/api/fetch-info', function (req, res) {
    // Retrieve params from POST body
    var sessionName = req.body.sessionName;
    console.log("Fetching session info | {sessionName}=" + sessionName);

    // If the session exists
    if (mapSessions[sessionName]) {
        mapSessions[sessionName].fetch()
            .then(changed => {
                console.log("Any change: " + changed);
                res.status(200).send(sessionToJson(mapSessions[sessionName]));
            })
            .catch(error => res.status(400).send(error.message));
    } else {
        var msg = 'Problems in the app server: the SESSION does not exist';
        console.log(msg);
        res.status(500).send(msg);
    }
});

// Fetch all session info
app.get('/api/fetch-all', function (req, res) {
    console.log("Fetching all session info");
    OV.fetch()
        .then(changed => {
            var sessions = [];
            OV.activeSessions.forEach(s => {
                sessions.push(sessionToJson(s));
            });
            console.log("Any change: " + changed);
            res.status(200).send(sessions);
        })
        .catch(error => res.status(400).send(error.message));
});

// Force disconnect
app.delete('/api/force-disconnect', function (req, res) {
    // Retrieve params from POST body
    var sessionName = req.body.sessionName;
    var connectionId = req.body.connectionId;
    // If the session exists
    if (mapSessions[sessionName]) {
        mapSessions[sessionName].forceDisconnect(connectionId)
            .then(() => res.status(200).send())
            .catch(error => res.status(400).send(error.message));
    } else {
        var msg = 'Problems in the app server: the SESSION does not exist';
        console.log(msg);
        res.status(500).send(msg);
    }
});

// Force unpublish
app.delete('/api/force-unpublish', function (req, res) {
    // Retrieve params from POST body
    var sessionName = req.body.sessionName;
    var streamId = req.body.streamId;
    // If the session exists
    if (mapSessions[sessionName]) {
        mapSessions[sessionName].forceUnpublish(streamId)
            .then(() => res.status(200).send())
            .catch(error => res.status(400).send(error.message));
    } else {
        var msg = 'Problems in the app server: the SESSION does not exist';
        console.log(msg);
        res.status(500).send(msg);
    }
});



/* Recording API */

// Start recording
app.post('/api/recording/start', function (req, res) {
    // Retrieve params from POST body
    var recordingProperties = {
        outputMode: req.body.outputMode,
        hasAudio: req.body.hasAudio,
        hasVideo: req.body.hasVideo,
    }
    var sessionId = req.body.session;
    console.log("Starting recording | {sessionId}=" + sessionId);

    OV.startRecording(sessionId, recordingProperties)
        .then(recording => res.status(200).send(recording))
        .catch(error => res.status(400).send(error.message));
});

// Stop recording
app.post('/api/recording/stop', function (req, res) {
    // Retrieve params from POST body
    var recordingId = req.body.recording;
    console.log("Stopping recording | {recordingId}=" + recordingId);

    OV.stopRecording(recordingId)
        .then(recording => res.status(200).send(recording))
        .catch(error => res.status(400).send(error.message));
});

// Delete recording
app.delete('/api/recording/delete', function (req, res) {
    // Retrieve params from DELETE body
    var recordingId = req.body.recording;
    console.log("Deleting recording | {recordingId}=" + recordingId);

    OV.deleteRecording(recordingId)
        .then(() => res.status(200).send())
        .catch(error => res.status(400).send(error.message));
});

// Get recording
app.get('/api/recording/get/:recordingId', function (req, res) {
    // Retrieve params from GET url
    var recordingId = req.params.recordingId;
    console.log("Getting recording | {recordingId}=" + recordingId);

    OV.getRecording(recordingId)
        .then(recording => res.status(200).send(recording))
        .catch(error => res.status(400).send(error.message));
});

// List all recordings
app.get('/api/recording/list', function (req, res) {
    console.log("Listing recordings");

    OV.listRecordings()
        .then(recordings => res.status(200).send(recordings))
        .catch(error => res.status(400).send(error.message));
});

function sessionToJson(session) {
    var json = {};
    json.sessionId = session.sessionId;
    json.createdAt = session.createdAt;
    json.customSessionId = !!session.properties.customSessionId ? session.properties.customSessionId : "";
    json.recording = session.recording;
    json.mediaMode = session.properties.mediaMode;
    json.recordingMode = session.properties.recordingMode;
    json.defaultRecordingProperties = session.properties.defaultRecordingProperties;
    var connections = {};
    connections.numberOfElements = session.activeConnections.length;
    var jsonArrayConnections = [];
    session.activeConnections.forEach(con => {
        var c = {};
        c.connectionId = con.connectionId;
        c.createdAt = con.createdAt;
        c.role = con.role;
        c.serverData = con.serverData;
        c.record = con.record;
        c.token = con.token;
        c.clientData = con.clientData;
        var pubs = [];
        con.publishers.forEach(p => {
            jsonP = {};
            jsonP.streamId = p.streamId;
            jsonP.createdAt = p.createdAt
            jsonP.hasAudio = p.hasAudio;
            jsonP.hasVideo = p.hasVideo;
            jsonP.audioActive = p.audioActive;
            jsonP.videoActive = p.videoActive;
            jsonP.frameRate = p.frameRate;
            jsonP.typeOfVideo = p.typeOfVideo;
            jsonP.videoDimensions = p.videoDimensions;
            pubs.push(jsonP);
        });
        var subs = [];
        con.subscribers.forEach(s => {
            subs.push(s);
        });
        c.publishers = pubs;
        c.subscribers = subs;
        jsonArrayConnections.push(c);
    });
    connections.content = jsonArrayConnections;
    json.connections = connections;
    return json;
}

//const server = express();
//const https = require('https').Server(server);

/*
var express = require('express')
  , http = require('http');
//make sure you keep this order
var app = express();
var server = http.createServer(app);
var io = require('socket.io')()

io.on("connection", function(socket){
    socket.on("entrar", function(apelido, callback){
        if(!(apelido in usuarios)){
            socket.apelido = apelido;
            usuarios[apelido] = socket;
    
            io.sockets.emit("atualizar usuarios", Object.keys(usuarios));
            io.sockets.emit("atualizar mensagens", " " + pegarDataAtual() + " " + apelido + " acabou de entrar na sala");
    
            callback(true);
        }else{
            callback(false);
        }
        });
    socket.on("enviar mensagem", function(mensagem_enviada, callback){
        mensagem_enviada = " " + pegarDataAtual() + " " + socket.apelido+ ": " +  mensagem_enviada;
        io.sockets.emit("atualizar mensagens", mensagem_enviada);
        callback();
    });
    socket.on("disconnect", function(){
        delete usuarios[socket.apelido];
        io.sockets.emit("atualizar usuarios", Object.keys(usuarios));
        io.sockets.emit("atualizar mensagens", " " + pegarDataAtual() + " " + socket.apelido + " saiu da sala");
      });
         
});

function pegarDataAtual(){
 var dataAtual = new Date();
 var hora = (dataAtual.getHours()<10 ? '0' : '') + dataAtual.getHours();
 var minuto = (dataAtual.getMinutes()<10 ? '0' : '') + dataAtual.getMinutes();
 

 var dataFormatada =  hora + ":" + minuto;
 return dataFormatada;
}

*/