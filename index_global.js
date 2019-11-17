'use strict';

const server = require('./server');

server.listen(80, '0.0.0.0', () => console.log('http://0.0.0.0:80/'));