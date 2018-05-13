/**
 * Created by fws on 2018/5/1.
 */

const path = require("path");
const home = require("../util/userHome")();
let tmp = path.join(home,'.zt-template');

module.exports = {
  git:"https://github.com/fws407296762/ztpc-template.git",
  tmpdir:tmp
}