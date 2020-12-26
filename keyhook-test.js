'use strict';

const ioHook = require('iohook'); // does not work with the new import syntax
const robot = require("robotjs");

ioHook.on('keydown', event => {
  console.log(event);              // { type: 'mousemove', x: 700, y: 400 }

  if (event.ctrlKey && event.keycode == '') {
    // Type "Hello World".
    robot.typeString("Hello World");

    // Press enter.
    robot.keyTap("enter");
  }
});

// Register and start hook
ioHook.start();

