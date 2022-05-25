var OV;
var session;

var sessionName;
var token;
var numVideos = 0;

var myUserName

/* OPENVIDU METHODS */

function joinSession() {
	
	myUserName = document.getElementById("userName").value;
		
	document.getElementById("join-btn").disabled = true;
	document.getElementById("join-btn").innerHTML = "Entrando...";

	getToken(function () {

		//  Inicia o openvidu

		OV = new OpenVidu(); // aqui coloca configurações padrões

		//  começa sessão

		session = OV.initSession();

		// Recebe quando há uma nova stream criada
		session.on('streamCreated', event => {
			
			// Subscribe na Stream para receber
			// Será colocado no site com ID video-container
			var subscriber = session.subscribe(event.stream, 'video-container');

			subscriber.on('videoElementCreated', event => {
				updateNumVideos(1);
			});

			subscriber.on('videoElementDestroyed', event => {
				updateNumVideos(-1);	
			});
		});

		session.on('sessionDisconnected', event => {
			
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

		session.on('exception', (exception) => {
			console.warn(exception);
		});

		session.on('signal:my-chat', (event) => {
			console.log(event.data); // mensagem
			console.log(event.from); // Conexão para enviar
			console.log(event.type); // Tipo ("my-chat")
		});

		session.on('colocandoUserLista', (event) =>{
			colocaLista();
		})

		session.on('signal', (event) => {
			var mensag = event.data.split(".././././.");
	
			const template = document.querySelector('template[data-template="mensagem"]');
			const nameEl = template.content.querySelector('.mensagem__name');
	
			if (mensag[1] || possibleEmojis[parseInt(mensag[2])]) {
				nameEl.innerText =  mensag[1];
			}
	
			template.content.querySelector('.mensagem__bubble').innerText = mensag[0];
			const clone = document.importNode(template.content, true);
			const mensagemDe = clone.querySelector('.mensagem');
	
			if (event.from.connectionId === session.connection.connectionId) {
				mensagemDe.classList.add('mensagem--mine');
			  } else {
				mensagemDe.classList.add('mensagem--theirs');
			}
	
			const mensagens1 = document.querySelector('.mensagens');
			mensagens1.appendChild(clone);
	
		});
		

		// Conecta a sessao utilizadno o token 

		session.connect(token)

			.then(() => {

				// Ao ser escolhida a sessão, atualiza a pagina para a sala
				$('#session-title').text(sessionName);
				$('#join').hide();
				$('#Gravando').hide();
				$('#session').show();
				$('#dwn').hide();

				// Pega o video com configurações  

				var publisher = OV.initPublisher('video-container', {
					audioSource: undefined, // Fonte de audio por padrão deixar indefinido
					videoSource: undefined, // Fonte de video por padrão deixar indefinido
					publishAudio: true, // Publicar com o audio ativado
					publishVideo: true, // Publicar com o video ativado
					resolution: '640x480', // Resolução do video
					frameRate: 30, // Frame rate
					insertMode: 'APPEND', // Target para adicionar na pagina 'video-container'
					mirror: false // Para espelhar o video 
				});

				// Quando o elemento do video for adicionado 
				publisher.on('videoElementCreated', event => {
					updateNumVideos(1);
					$(event.element).prop('muted', true); // Mutar o video local
				});

				// Quando sair da chamada
				publisher.on('videoElementDestroyed', event => {
					updateNumVideos(-1);
				});

				// Publica a stream 

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

	// Sair da sessão
	session.disconnect();
	enableBtn();
}

function enableBtn (){
	document.getElementById("join-btn").disabled = false;
	document.getElementById("join-btn").innerHTML = "Entrar!";
}

function getToken(callback) {
	sessionName = $("#sessionName").val(); // Sessão escolhido pelo usuario
	httpRequest(
		'POST',
		'api/get-token', {
			sessionName: sessionName,
		},
		'Request of TOKEN gone WRONG:',
		res => {
			token = res[0]; // Pega o token da resposta
			console.warn('Request of TOKEN gone WELL (TOKEN:' + token + ')');
			callback(token); 
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
	$('#dwn').hide();
	$('#link').show();
	$('#Gravando').show();
	var outputMode = 'COMPOSED';
	var hasAudio = $('#has-audio-checkbox').prop('checked');
	var hasVideo = $('#has-video-checkbox').prop('checked');

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
	$('#Gravando').hide();
	var forceRecordingId = document.getElementById('forceRecordingId').value;
	var url_dwn =	"https://150.162.83.205:4443/openvidu/recordings/"+ forceRecordingId+"/"+forceRecordingId+end;
	$('#dwn').hide();
	$('#link').show();
	
	lista_dwn[n] = url_dwn
	n++
	console.log('Lista:',lista_dwn)
	document.getElementById('link').value ="https://150.162.83.205:4443/openvidu/recordings/"+ forceRecordingId+"/"+forceRecordingId+end;
	document.getElementById("buttonStartRecording").disabled = false;
	document.getElementById("buttonStopRecording").disabled = true;

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
	n--
	lista_dwn[n] = ''
	
	console.log('Lista:',lista_dwn)
	//$('#dwn').hide();
	document.getElementById('link').value = null
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

function listRecordings() {
	linktodwn = $("<p class='lista' />").text("1")
	$("#dwn").append(linktodwn)	
	$(".lista").remove()

	for (var i=0; i != n; i++){
	linktodwn = $("<p class='lista' />").text(lista_dwn[i])
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

events = '';

window.onbeforeunload = function () { 
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

function mandar_mens() {
    var mensag = document.getElementById("texto_mensagem").value;
    document.getElementById("texto_mensagem").value = "";
    mensag = mensag+".././././."+myUserName+ " às " +pegarDataAtual();
    session.signal({
            data: mensag,
            to: [],
            type: 'my-chat',
        })
        .then(() => {
            console.log("Mensagem enviado por ",myUserName);
        })
        .catch(error => {
            console.error(error);
        })
}

function pegarDataAtual(){
    var dataAtual = new Date();
    var hora = (dataAtual.getHours()<10 ? '0' : '') + dataAtual.getHours();
    var minuto = (dataAtual.getMinutes()<10 ? '0' : '') + dataAtual.getMinutes();
	var dataFormatada =  hora + ":" + minuto;
    return dataFormatada;
}