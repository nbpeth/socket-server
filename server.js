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

    notifyCaller(message);

    ws.on('message', handleIncomingMessages);
};

handleIncomingMessages = (message) => {
    const messageData = JSON.parse(message);
    const eventType = messageData.eventType;
    const payload = messageData.payload;

    console.log('received!!', message);
    console.log('type:::', eventType)

    switch (eventType) {
        case 'state-of-the-state':
            notifyCaller(formatMessage(eventType, state));
            break;
        case 'session-created':
            createNewSession(payload);
            notifyClients(formatMessage(eventType, state))
    }
};


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

createNewSession = (message) => {
    const sessionName = message && message.sessionName ? message.sessionName : undefined;
    if (!sessionName) {
        return;
    }
    state.sessions[sessionName] = {participants: {}};
    const stateMessage = formatMessage('session-created', state);

    notifyClients(stateMessage)
};

formatMessage = (eventType, payload) => ({
    eventType: eventType,
    payload: payload
});

wss.on('connection', handleNewClients);

server.listen(process.env.PORT || 8999, () => {
    console.log(`Server running on port ${server.address().port}`);
});