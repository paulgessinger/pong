#!/bin/bash

current_dir=$(pwd)
echo $current_dir

function stop {
   forever  -o ./out.log -e ./err.log -m 1 stop server.js 
}


function start {
   forever -p $BASEDIR -a -l ./pong.log -o ./out.log -e ./err.log -m 1 start server.js
}

function restart {
   forever  -o ./out.log -e ./err.log -m 1 restart server.js 
}

case "$1" in
   start)
      start
   ;;
   stop)
      stop
   ;;
   restart)
      restart
   ;;
   *)
      echo "Usage: $0 {start|stop|restart}"
esac

