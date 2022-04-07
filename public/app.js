var OV;
var session;

var sessionName;
var token;
var numVideos = 0;


/* OPENVIDU METHODS */

//const link= 'https://localhost:5000/'

function joinSession() {
//	connectSocketToSignaling()
	

//	var socket = io.connect(link,{secure:true});
	
	// --- 0) Change the button ---
		
	document.getElementById("join-btn").disabled = true;
	document.getElementById("join-btn").innerHTML = "Entrando...";

	getToken(function () {

		// --- 1) Get an OpenVidu object ---

		OV = new OpenVidu();

		// --- 2) Init a session ---

		session = OV.initSession();

		// --- 3) Specify the actions when events take place in the session ---

		session.on('connectionCreated', event => {
			pushEvent(event);
		});

		session.on('connectionDestroyed', event => {
			pushEvent(event);
		});

		// On every new Stream received...
		session.on('streamCreated', event => {
			pushEvent(event);

			// Subscribe to the Stream to receive it
			// HTML video will be appended to element with 'video-container' id
			var subscriber = session.subscribe(event.stream, 'video-container');

			// When the HTML video has been appended to DOM...
			subscriber.on('videoElementCreated', event => {
				pushEvent(event);
				// Add a new HTML element for the user's name and nickname over its video
				updateNumVideos(1);
			});

			// When the HTML video has been appended to DOM...
			subscriber.on('videoElementDestroyed', event => {
				pushEvent(event);
				// Add a new HTML element for the user's name and nickname over its video
				updateNumVideos(-1);
			});

			// When the subscriber stream has started playing media...
			subscriber.on('streamPlaying', event => {
				pushEvent(event);
			});
		});

		session.on('streamDestroyed', event => {
			pushEvent(event);
		});

		session.on('sessionDisconnected', event => {
			pushEvent(event);
			if (event.reason !== 'disconnect') {
				removeUser();
			}
			if (event.reason !== 'sessionClosedByServer') {
				session = null;
				numVideos = 0;
				$('#join').show();
				$('#session').hide();
			}
		});

		session.on('recordingStarted', event => {
			pushEvent(event);
		});

		session.on('recordingStopped', event => {
			pushEvent(event);
		});

		// On every asynchronous exception...
		session.on('exception', (exception) => {
			console.warn(exception);
		});

		// --- 4) Connect to the session passing the retrieved token and some more data from
		//        the client (in this case a JSON with the nickname chosen by the user) ---

		session.connect(token)
			.then(() => {

				// --- 5) Set page layout for active call ---

				
				$('#session-title').text(sessionName);
				$('#join').hide();
				$('#session').show();
				var nome=$("#apelido").val()
				
				//chat

				/*
				socket.emit("entrar", $(this).find("#apelido").val(), function(valido){ //Verifica se o usuario é valido
					if(valido){
						$('#session-title').text(sessionName);
						$('#join').hide();
						$('#session').show();        // e mostra o chat
					}else{
						$("#acesso_usuario").val("");
						alert("Nome já utilizado nesta sala");
					}
				});
				*/
				//


				// --- 6) Get your own camera stream ---

				var publisher = OV.initPublisher('video-container', {
					audioSource: undefined, // The source of audio. If undefined default microphone
					videoSource: undefined, // The source of video. If undefined default webcam
					publishAudio: true, // Whether you want to start publishing with your audio unmuted or not
					publishVideo: true, // Whether you want to start publishing with your video enabled or not
					resolution: '640x480', // The resolution of your video
					frameRate: 30, // The frame rate of your video
					insertMode: 'APPEND', // How the video is inserted in the target element 'video-container'
					mirror: false // Whether to mirror your local video or not
				});

				// --- 7) Specify the actions when events take place in our publisher ---

				// When the publisher stream has started playing media...

				/*
				publisher.on('accessAllowed', event => {
					pushEvent({
						type: 'accessAllowed'
					});
				});

				publisher.on('accessDenied', event => {
					pushEvent(event);
				});

				publisher.on('accessDialogOpened', event => {
					pushEvent({
						type: 'accessDialogOpened'
					});
				});

				publisher.on('accessDialogClosed', event => {
					pushEvent({
						type: 'accessDialogClosed'
					});
				});
				

				// When the publisher stream has started playing media...
				publisher.on('streamCreated', event => {
					pushEvent(event);
				});
				*/
				// When our HTML video has been added to DOM...
				publisher.on('videoElementCreated', event => {
					pushEvent(event);
					updateNumVideos(1);
					$(event.element).prop('muted', true); // Mute local video
				});

				// When the HTML video has been appended to DOM...
				publisher.on('videoElementDestroyed', event => {
					pushEvent(event);
					// Add a new HTML element for the user's name and nickname over its video
					updateNumVideos(-1);
				});

				// When the publisher stream has started playing media...
				/*
				publisher.on('streamPlaying', event => {
					pushEvent(event);
				});
				*/
				// --- 8) Publish your stream ---

				session.publish(publisher);
				
			})
			.catch(error => {
				console.warn('There was an error connecting to the session:', error.code, error.message);
				enableBtn();
			});

		return false;
	});
}

function leaveSession() {

	// --- 9) Leave the session by calling 'disconnect' method over the Session object ---
	session.disconnect();
	enableBtn();

}

/* OPENVIDU METHODS */

function enableBtn (){
	document.getElementById("join-btn").disabled = false;
	document.getElementById("join-btn").innerHTML = "Entrar!";
}

/* APPLICATION REST METHODS */

function getToken(callback) {
	sessionName = $("#sessionName").val(); // Video-call chosen by the user

	httpRequest(
		'POST',
		'api/get-token', {
			sessionName: sessionName
		},
		'Request of TOKEN gone WRONG:',
		res => {
			token = res[0]; // Get token from response
			console.warn('Request of TOKEN gone WELL (TOKEN:' + token + ')');
			callback(token); // Continue the join operation
		}
	);
}

function removeUser() {
	httpRequest(
		'POST',
		'api/remove-user', {
			sessionName: sessionName,
			token: token
		},
		'User couldn\'t be removed from session',
		res => {
			console.warn("You have been removed from session " + sessionName);
		}
	);
}

function closeSession() {
	httpRequest(
		'DELETE',
		'api/close-session', {
			sessionName: sessionName
		},
		'Session couldn\'t be closed',
		res => {
			console.warn("Session " + sessionName + " has been closed");
		}
	);
}

function fetchInfo() {
	httpRequest(
		'POST',
		'api/fetch-info', {
			sessionName: sessionName
		},
		'Session couldn\'t be fetched',
		res => {
			console.warn("Session info has been fetched");
			$('#textarea-http').text(JSON.stringify(res, null, "\t"));
		}
	);
}

function fetchAll() {
	httpRequest(
		'GET',
		'api/fetch-all', {},
		'All session info couldn\'t be fetched',
		res => {
			console.warn("All session info has been fetched");
			$('#textarea-http').text(JSON.stringify(res, null, "\t"));
		}
	);
}

function forceDisconnect() {
	httpRequest(
		'DELETE',
		'api/force-disconnect', {
			sessionName: sessionName,
			connectionId: document.getElementById('forceValue').value
		},
		'Connection couldn\'t be closed',
		res => {
			console.warn("Connection has been closed");
		}
	);
}

function forceUnpublish() {
	httpRequest(
		'DELETE',
		'api/force-unpublish', {
			sessionName: sessionName,
			streamId: document.getElementById('forceValue').value
		},
		'Stream couldn\'t be closed',
		res => {
			console.warn("Stream has been closed");
		}
	);
}

function httpRequest(method, url, body, errorMsg, callback) {
	$('#textarea-http').text('');
	var http = new XMLHttpRequest();
	http.open(method, url, true);
	http.setRequestHeader('Content-type', 'application/json');
	http.addEventListener('readystatechange', processRequest, false);
	http.send(JSON.stringify(body));

	function processRequest() {
		if (http.readyState == 4) {
			if (http.status == 200) {
				try {
					callback(JSON.parse(http.responseText));
				} catch (e) {
					callback(e);
				}
			} else {
				console.warn(errorMsg + ' (' + http.status + ')');
				console.warn(http.responseText);
				$('#textarea-http').text(errorMsg + ": HTTP " + http.status + " (" + http.responseText + ")");
			}
		}
	}
}

var end = ''

function startRecording() {
	$('#dwn').show();
	//var outputMode = $('input[name=outputMode]:checked').val();
	var outputMode = 'COMPOSED';
	var hasAudio = $('#has-audio-checkbox').prop('checked');

	// hasAudio = true;
	var hasVideo = $('#has-video-checkbox').prop('checked');
	//var hasVideo = false;


	if (hasAudio == true & hasVideo ==false){
		end = '.webm'
	}else{
		end = '.mp4'
	}

	document.getElementById("buttonStartRecording").disabled = true;
	httpRequest(
		'POST',
		'api/recording/start', {
			session: session.sessionId,
			outputMode: outputMode,
			hasAudio: hasAudio,
			hasVideo: hasVideo
		},
		'Start recording WRONG',
		res => {
			console.log(res);
			document.getElementById('forceRecordingId').value = res.id;
			document.getElementById('link').value = res.id;
			checkBtnsRecordings();
			$('#textarea-http').text(JSON.stringify(res, null, "\t"));
		}
	);
}
var n=0
var lista_dwn = []

function stopRecording() {
	var forceRecordingId = document.getElementById('forceRecordingId').value;
	//document.getElementById('link').value ="https://localhost:4443/openvidu/recordings/"+ forceRecordingId+"/"+forceRecordingId+".mp4";
	//document.getElementById('link').value ="https://150.162.83.205:4443/openvidu/recordings/"+ forceRecordingId+"/"+forceRecordingId+".mp4";
	
	var url_dwn =	"https://150.162.83.205:4443/openvidu/recordings/"+ forceRecordingId+"/"+forceRecordingId+end;
	
	
	lista_dwn[n] = url_dwn
	n++
	console.log('Lista:',lista_dwn)
	document.getElementById('link').value ="https://150.162.83.205:4443/openvidu/recordings/"+ forceRecordingId+"/"+forceRecordingId+end;
	document.getElementById("buttonStartRecording").disabled = false;
	document.getElementById("buttonStopRecording").disabled = true;

//https://localhost:4443/openvidu/recordings/ses_HyCtsAsBBh/ses_HyCtsAsBBh.mp4

	httpRequest(
		'POST',
		'api/recording/stop', {
			recording: forceRecordingId
		},
		'Stop recording WRONG',
		res => {
			console.log(res);
			$('#textarea-http').text(JSON.stringify(res, null, "\t"));
		}
	);
}


function deleteRecording() {
	var forceRecordingId = document.getElementById('forceRecordingId').value;
	//document.getElementById("buttonDeleteRecording").disabled = true;
	lista_dwn[n] = ''
	n--

	//$("#lista").remove()	
	$('#dwn').hide();
	httpRequest(
		'DELETE',
		'api/recording/delete', {
			recording: forceRecordingId
		},
		'Delete recording WRONG',
		res => {
			console.log("DELETE ok");
			$('#textarea-http').text("DELETE ok");
		}
	);
}
/*
function getRecording() {
	var forceRecordingId = document.getElementById('forceRecordingId').value;
	httpRequest(
		'GET',
		'api/recording/get/' + forceRecordingId, {},
		'Get recording WRONG',
		res => {
			console.log(res);
			$('#textarea-http').text(JSON.stringify(res, null, "\t"));
		}
	);
}
*/

function listRecordings() {
	
	//document.getElementById('link').value =lista_dwn
//	$("#lista").remove()
	for (var i=0; i != n; i++){
	linktodwn = $("<p id='lista' />").text(lista_dwn[i])
	$("#dwn").append(linktodwn)	
	}
	
	$('#dwn').show();
	$('#link').hide();
	httpRequest(
		'GET',
		'api/recording/list', {},
		'List recordings WRONG',
		res => {
			console.log(res);
			$('#textarea-http').text(JSON.stringify(res, null, "\t"));
		}
	);
}

/* APPLICATION REST METHODS */



/* APPLICATION BROWSER METHODS */

events = '';

window.onbeforeunload = function () { // Gracefully leave session
	if (session) {
		removeUser();
		leaveSession();
	}
}

function updateNumVideos(i) {
	numVideos += i;
	$('video').removeClass();
	switch (numVideos) {
		case 1:
			$('video').addClass('two');
			break;
		case 2:
			$('video').addClass('two');
			break;
		case 3:
			$('video').addClass('three');
			break;
		case 4:
			$('video').addClass('four');
			break;
	}
}

function checkBtnsForce() {
	if (document.getElementById("forceValue").value === "") {
		document.getElementById('buttonForceUnpublish').disabled = true;
		document.getElementById('buttonForceDisconnect').disabled = true;
	} else {
		document.getElementById('buttonForceUnpublish').disabled = false;
		document.getElementById('buttonForceDisconnect').disabled = false;
	}
}

function checkBtnsRecordings() {
	if (document.getElementById("forceRecordingId").value === "") {
		document.getElementById('buttonGetRecording').disabled = true;
		document.getElementById('buttonStopRecording').disabled = true;
		document.getElementById('buttonDeleteRecording').disabled = true;
	} else {
		document.getElementById('buttonGetRecording').disabled = false;
		document.getElementById('buttonStopRecording').disabled = false;
		document.getElementById('buttonDeleteRecording').disabled = false;
	}
}

function pushEvent(event) {
	events += (!events ? '' : '\n') + event.type;
	$('#textarea-events').text(events);
}

function clearHttpTextarea() {
	$('#textarea-http').text('');
}

function clearEventsTextarea() {
	$('#textarea-events').text('');
	events = '';
}

/* APPLICATION BROWSER METHODS */

/*

function connectSocketToSignaling() {
	var socket = io.connect();

        $("form#chat").submit(function(e){
            e.preventDefault();
            socket.emit("enviar mensagem", $(this).find("#texto_mensagem").val(), function(){
                $("form#chat #texto_mensagem").val("");
            });
             
        });

        socket.on("atualizar mensagens", function(mensagem){
            var mensagem_formatada = $("<p />").text(mensagem);
            $("#historico_mensagens").append(mensagem_formatada);
        });

        $("form#login").submit(function(e){
            e.preventDefault();

            socket.emit("entrar", $(this).find("#apelido").val(), function(valido){
                if(valido){
                    $("#acesso_usuario").hide();
                    $("#sala_chat").show();
                }else{
                    $("#acesso_usuario").val("");
                    alert("Nome já utilizado nesta sala");
                }
            });
        });

        socket.on("atualizar usuarios", function(usuarios){
            $("#lista_usuarios").empty();
            $("#lista_usuarios").append("<option value=''>Todos</option>");
            $.each(usuarios, function(indice){
                var opcao_usuario = $("<option />").text(usuarios[indice]);
                $("#lista_usuarios").append(opcao_usuario);
            });
        });
}

*/