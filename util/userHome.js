'use strict';

const os = require("os");

function homeDir(){
  let env = process.env;
  let home = env.HOME;
  let user = env.LOGNAME || env.USER || env.LNAME || env.USERNAME;

  if(process.platform === 'win32'){
    return env.USERPROFILE || env.HOMEDIRVE + env.HOMEPATH || home || null;
  }
  if(process.platform === "darwin"){
    return home || (user ? '/Users/' + user : null);
  }
  if(process.platform === 'linux'){
    return home || (process.getuid() === 0 ? "/root" : (user ? '/home/' + user : null));
  }
  return home || null;
}

module.exports = typeof os.homedir === 'function' ? os.homedir : homeDir;