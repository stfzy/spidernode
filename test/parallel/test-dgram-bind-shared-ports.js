// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';
const common = require('../common');
const assert = require('assert');
const cluster = require('cluster');
const dgram = require('dgram');

if (cluster.isMaster) {
  const worker1 = cluster.fork();

  if (common.isWindows) {
    const checkErrType = (er) => {
      assert.strictEqual(er.code, 'ENOTSUP');
      worker1.kill();
    };

    worker1.on('error', common.mustCall(checkErrType, 1));
    return;
  }

  worker1.on('message', (msg) => {
    assert.strictEqual(msg, 'success');
    const worker2 = cluster.fork();

    worker2.on('message', (msg) => {
      assert.strictEqual(msg, 'socket2:EADDRINUSE');
      worker1.kill();
      worker2.kill();
    });
  });
} else {
  const socket1 = dgram.createSocket('udp4', common.noop);
  const socket2 = dgram.createSocket('udp4', common.noop);

  socket1.on('error', (err) => {
    // no errors expected
    process.send('socket1:' + err.code);
  });

  socket2.on('error', (err) => {
    // an error is expected on the second worker
    process.send('socket2:' + err.code);
  });

  socket1.bind({
    address: 'localhost',
    port: common.PORT,
    exclusive: false
  }, () => {
    socket2.bind({ port: common.PORT + 1, exclusive: true }, () => {
      // the first worker should succeed
      process.send('success');
    });
  });
}
