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

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    
    console.log('received: %s', message);

    wss.clients
      .forEach(client => {
        const clientIsNotSenderOfMessage = client !== ws;
        if (clientIsNotSenderOfMessage) {
          client.send(message);
        }
      });
  });
});

server.listen(process.env.PORT || 8999, () => {
  console.log(`Server running on port ${server.address().port}`);
});