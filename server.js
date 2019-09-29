const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const http = require('http');
const WebSocket = require('ws');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
let _ws;
const state = {
  sessions: {},
};

handleNewClients = (ws) => {
  _ws = ws;
  // new connection? ship the current app state
  const message = formatMessage('state-of-the-state', state);

  notifyCaller(message);

  ws.on('message', handleIncomingMessages);
};

handleIncomingMessages = (message) => {
  const messageData = JSON.parse(message);
  const eventType = messageData.eventType;

  console.log('type:::', eventType, 'load...', messageData);

  switch (eventType) {
    case 'state-of-the-state':
      notifyCaller(formatMessage(eventType, state));
      break;
    case 'session-created':
      createNewSession(messageData);
      break;
    case 'session-state':
      getSessionState(messageData);
      break;
    case 'participant-joined':
      addParticipantToSession(messageData)
      break;
    case 'participant-removed':
      removeParticipantFromSession(messageData)
      break;
    case 'point-submitted':
      pointWasSubmitted(messageData);
      break;
    case 'points-reset':
      resetPoints(messageData);
      break;
    case 'points-revealed':
      revealPoints(messageData);
      break;

  }
};
revealPoints = (messageData) => {
  const eventType = messageData.eventType;
  const payload = messageData.payload;
  const requestedSession = payload.sessionName;
  const sessionData = state.sessions[requestedSession];
  notifyClients(formatMessage(eventType, sessionData, requestedSession))
}

resetPoints = (messageData) => {
  const eventType = messageData.eventType;
  const payload = messageData.payload;
  const requestedSession = payload.sessionName;
  const sessionData = state.sessions[requestedSession];
  // ew
  Object.values(sessionData).forEach(participant => {
    Object.values(participant).forEach(p => p.point = 0);
  });

  notifyClients(formatMessage(eventType, sessionData, requestedSession))

}

getSessionState = (messageData) => {
  const eventType = messageData.eventType;
  const payload = messageData.payload;
  const requestedSession = payload.sessionName;
  const sessionData = state.sessions[requestedSession];
  notifyCaller(formatMessage(eventType, sessionData, requestedSession));
}

pointWasSubmitted = (messageData) => {
  const payload = messageData.payload;
  const requestedSession = payload.sessionName;
  const sessionData = state.sessions[requestedSession];
  const targetUser = payload.userName;

  sessionData.participants[targetUser].point = payload.value;
  notifyClients(formatMessage(messageData.eventType, sessionData, requestedSession))
}

addParticipantToSession = (messageData) => {
  const payload = messageData.payload;
  const requestedSession = payload.sessionName;
  const sessionData = state.sessions[requestedSession];
  const participantToAdd = payload.userName;

  sessionData.participants[participantToAdd] = { point: 0 };
  console.log('new user!', messageData)

  notifyClients(formatMessage(messageData.eventType, sessionData, requestedSession))
}

removeParticipantFromSession = (messageData) => {
  const payload = messageData.payload;
  const requestedSession = payload.sessionName;
  const sessionData = state.sessions[requestedSession];
  const participantToRemove = payload.userName;
  sessionData.participants[participantToRemove] = undefined;

  notifyClients(formatMessage(messageData.eventType, sessionData, requestedSession))
}

createNewSession = (messageData) => {
  const payload = messageData.payload;
  const sessionName = payload && payload.sessionName ? payload.sessionName : undefined;
  if (!sessionName) {
    return;
  }
  state.sessions[sessionName] = { participants: {} };
  const stateMessage = formatMessage('session-created', state);

  notifyClients(stateMessage)
};

formatMessage = (eventType, payload, targetSession) => ({
  eventType: eventType,
  payload: payload,
  targetSession: targetSession,
});

notifyClients = (message) => {
  wss.clients
    .forEach(client => {
      client.send(JSON.stringify(message));
    });
};

notifyCaller = (message) => {
  wss.clients
    .forEach(client => {
      if (client === _ws) {
        client.send(JSON.stringify(message));
      }
    });
};

wss.on('connection', handleNewClients);

server.listen(process.env.PORT || 8999, () => {
  console.log(`Server running on port ${server.address().port}`);
});