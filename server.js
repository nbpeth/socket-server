const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const http = require('http');
const WebSocket = require('ws');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors);

const server = http.createServer(app);
const wss = new WebSocket.Server({server});
let _ws;
const state = {
    sessions: {},
};

handleNewClients = (ws) => {
    _ws = ws;
    // new connection? ship the current app state
    const message = formatMessage('state-of-the-state', state);

    sendCurrentState(ws, message);

    ws.on('message', handleIncomingMessages);
};

handleIncomingMessages = (message) => {
    const messageObj = JSON.parse(message);
    const messageKey = Object.keys(messageObj)[0];
    const messageValue = Object.values(messageObj)[0];

    // console.log('received!!', message);

    switch (messageKey) {
        case 'session-created':
            createNewSession(messageObj['session-created']);
            notifyClients(state);
            break;

        case 'state-of-the-state':
            notifyCaller(formatMessage('state-of-the-state', state));
            break;

        case 'session-state':
            notifyCaller(formatMessage('session-state', state));
            break;

        case 'participant-update':
            addParticipantToSession(messageValue);
            break;

        case 'participant-removed':
            console.log('removing!', messageValue)
            removeParticipantFromSession(messageValue);
            break;
        default:
        // nothing
    }
};

addParticipantToSession = (messageValue) => {
    const sessionToUpdate = Object.keys(messageValue)[0];
    const merged = {...state.sessions[sessionToUpdate].participants, ...messageValue[sessionToUpdate].participants};
    state.sessions[sessionToUpdate].participants = merged;
    const message = formatMessage('participant-update', state);

    notifyClients(message);
};

removeParticipantFromSession = (messageValue) => {
    const sessionToUpdate = Object.keys(messageValue)[0];
    const userToRemove = messageValue[sessionToUpdate];
    delete state.sessions[sessionToUpdate].participants[userToRemove];
    const message = formatMessage('participant-removed', state);

    notifyClients(message);
}

removeParticipant = (messageValue) => {

}

sendCurrentState = (ws, state) => ws.send(JSON.stringify(state));

notifyClients = (message) => {
    wss.clients
        .forEach(client => {
            // const clientIsNotSenderOfMessage = client !== ws;
            // if (clientIsNotSenderOfMessage) {
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

createNewSession = (message) => {
    const sessionName = message && message.sessionName ? message.sessionName : undefined;
    if (!sessionName) {
        return;
    }
    state.sessions[sessionName] = {participants: {}};
    const stateMessage = formatMessage('session-created', state);

    notifyClients(stateMessage)
};

formatMessage = (key, messageBody) => ({[key]: messageBody});

wss.on('connection', handleNewClients);

server.listen(process.env.PORT || 8999, () => {
    console.log(`Server running on port ${server.address().port}`);
});