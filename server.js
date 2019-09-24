var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
var http = require('http');
const WebSocket = require('ws');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
let _ws;
const state = {
  sessions: {},
}

handleNewClients = (ws) => {
  _ws = ws;
  // new connection? ship the current app state
  const message = formatMessage('state-of-the-state', state);

  sendCurrentState(ws, message);

  ws.on('message', handleIncomingMessages);
}

handleIncomingMessages = (message) => {
  const messageObj = JSON.parse(message);
  const messageKey = Object.keys(messageObj)[0];
  const messageValue = messageObj[messageKey]

  console.log('received:', messageObj);

  switch (messageKey) {
    case 'session-created':
      createNewSession(messageObj['session-created']);
      notifyClients(wss, messageObj);
      break;
    case 'state-of-the-state':
      notifyCaller(formatMessage('state-of-the-state', state));
      break;
    case 'session-state':
      const sessionId = messageObj['session-state'];
      console.log('??', sessionId, messageObj, messageObj['session-state'], state)
      notifyCaller(formatMessage('session-state', state.sessions[sessionId]));
      break;
    default:
  }

}

sendCurrentState = (ws, state) => ws.send(JSON.stringify(state))

notifyClients = (message) => {
  wss.clients
    .forEach(client => {
      // const clientIsNotSenderOfMessage = client !== ws;
      // if (clientIsNotSenderOfMessage) {
      // console.log('sending', JSON.stringify(message));
      client.send(JSON.stringify(message));
      // }
    });
}

notifyCaller = (message) => {
  wss.clients
    .forEach(client => {
      if (client == _ws) {
        client.send(JSON.stringify(message));
      }
    });
}

createNewSession = (message) => {
  const sessionName = message && message.sessionName ? message.sessionName : undefined;
  if (!sessionName) {
    return;
  }
  state.sessions[sessionName] = {}
  const stateMessage = formatMessage('session-created', state)

  notifyClients(stateMessage)
}

formatMessage = (key, messageBody) => ({ [key]: messageBody });

wss.on('connection', handleNewClients);

server.listen(process.env.PORT || 8999, () => {
  console.log(`Server running on port ${server.address().port}`);
});