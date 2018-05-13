/*
*  @描述：生成项目目录
*  @作者：付文松
*  @创建时间：2018/4/10
*/
const chalk = require('chalk')
const Metalsmith = require('metalsmith');
const path = require("path");
const exists = require("fs").existsSync;
const metadata = require('read-metadata');
const exec = require('child_process').execSync;
const async = require('async');
const inquirer = require('inquirer');
const render = require('consolidate').handlebars.render

module.exports = function generate(name,src,dest,done){
  const opts = getOptions(name,src);
  const metalsmith = Metalsmith(src);

  const data = Object.assign(metalsmith.metadata(), {
    destDirName: name,
    inPlace: dest === process.cwd(),
    noEscape: true,
    isNotTest:true
  })

  metalsmith.use(askQuestions(opts.prompts))
    .use(renderTemplateFiles(opts.skipInterpolation));
  metalsmith.clean(false)
    .source('.') // start from template root instead of `./src` which is Metalsmith's default for `source`
    .destination(dest)
    .build((err, files) => {
      done(err)
      if (typeof opts.complete === 'function') {
        const helpers = { chalk, files }
        opts.complete(data, helpers)
      } else {
        throw new Error(opts.completeMessage, data)
      }
    })
  return data;
}

//获取到的meta.js 中数据进行处理
function getOptions(name,dir){
  const opts = getMetadata();
  setDefault(opts,"name",name);
  const author = getGitUser();
  if(author){
    setDefault(opts,"author",author);
  }
  return opts;
}

//获取 meta.js 中数据
function getMetadata(){
  const js = path.join(__dirname,'./meta.js');
  let opts = {};
  if(exists(js)){
      const req = require(path.resolve(js));
      if(req !== Object(req)){
        throw new Error('meta.js needs to expose an object')
      }
      opts = req;
  }
  return opts;
}

//设置默认值
function setDefault (opts, key, val) {
  const prompts = opts.prompts || (opts.prompts = {})
  if (!prompts[key] || typeof prompts[key] !== 'object') {
    prompts[key] = {
      'type': 'string',
      'default': val
    }
  } else {
    prompts[key]['default'] = val
  }
}

//获取 git 用户信息
function getGitUser(){
  let name,email;
  try{
    name = exec("git config --get user.name");
    email = exec("git config --get user.email");
  }catch(e){}
  name = name && JSON.stringify(name.toString().trim()).slice(1,-1);
  email = email&& ('<'+email.toString().trim()+'>');
  return (name || "") + (email || '');
}

const promptMapping = {
  string: 'input',
  boolean: 'confirm'
}

//创建问问题中间件
function askQuestions(prompts){
  return (files, metalsmith, done) => {
    ask(prompts, metalsmith.metadata(), done)
  }
}

//问问题处理配置
function ask(prompts,data,done){
  //用 promise 形式来处理

  async.eachSeries(Object.keys(prompts),(key,next) =>{
    prompt(data,key,prompts[key],next);
  },done)
}

//开始执行问题
function prompt(data,key,prompt,done){

  //当碰到 when 的时候跳过问题

  if (prompt.when && !evaluate(prompt.when, data)) {
    return done()
  }
  let promptDefault = prompt.default;
  if(typeof prompt.default === 'function'){
    promptDefault = function(){
      return prompt.default.bind(this)(data);
    }
  }

  inquirer.prompt([{
    type:promptMapping[prompt.type] || prompt.type,
    name:key,
    message:prompt.message || prompt.label || key,
    default:promptDefault,
    choices:prompt.choices || [],
    validate:prompt.validate || (() => true)
  }]).then(answers => {
    if(Array.isArray(answers[key])){
      data[key] = {};
      answers[key].forEach(multiChoiceAnswer =>{
        data[key][multiChoiceAnswer] = true;
      })
    }else if(typeof answers[key] === 'string'){
      data[key] = answers[key].replace(/"/g, '\\"')
    }else{
      data[key] = answers[key]
    }
    done()
  }).catch(done)
}

//
function evaluate (exp, data) {
  /* eslint-disable no-new-func */
  const fn = new Function('data', 'with (data) { return ' + exp + '}')
  try {
    return fn(data)
  } catch (e) {
    console.error(chalk.red('Error when evaluating filter condition: ' + exp))
  }
}

function renderTemplateFiles (skipInterpolation) {

  skipInterpolation = typeof skipInterpolation === 'string'
    ? [skipInterpolation]
    : skipInterpolation
  return (files, metalsmith, done) => {
    const keys = Object.keys(files)
    const metalsmithMetadata = metalsmith.metadata()
    async.each(keys, (file, next) => {
      // skipping files with skipInterpolation option
      if (skipInterpolation && multimatch([file], skipInterpolation, { dot: true }).length) {
        return next()
      }
      const str = files[file].contents.toString()
      // do not attempt to render files that do not have mustaches
      if (!/{{([^{}]+)}}/g.test(str)) {
        return next()
      }
      render(str, metalsmithMetadata, (err, res) => {
        if (err) {
          err.message = `[${file}] ${err.message}`
          return next(err)
        }
        files[file].contents = new Buffer(res)
        next()
      })
    }, done)
  }
}