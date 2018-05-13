/*
*  @描述：元数据
*  @作者：付文松
*  @创建时间：2018/4/10
*/

const path = require('path')
const fs = require('fs')

const {
  sortDependencies,
  installDependencies,
  printMessage,
} = require('./index');
const pkg = require('../package.json');

module.exports = {
  prompts: {
    name: {
      when: 'isNotTest',
      type: 'string',
      required: true,
      message: '项目名',
    },
    description: {
      when: 'isNotTest',
      type: 'string',
      required: false,
      message: 'Project description',
      default: '项目描述',
    },
    author: {
      when: 'isNotTest',
      type: 'string',
      message: '作者',
    },
    autoInstall: {
      when: 'isNotTest',
      type: 'list',
      message: '创建完后是否自动安装依赖？',
      choices: [
        {
          name: 'Yes, use CNPM',
          value: 'cnpm',
          short: 'cnpm',
        },
        {
          name: 'Yes, use NPM',
          value: 'npm',
          short: 'npm',
        },
        {
          name: 'No, I will handle that myself',
          value: false,
          short: 'no',
        },
      ],
    }
  },
  complete: function(data, { chalk }) {
    const green = chalk.green;
    sortDependencies(data, green);
    const cwd = path.join(process.cwd(), data.inPlace ? '' : data.destDirName);
    if (data.autoInstall) {
      installDependencies(cwd, data.autoInstall, green)
        .then(() => {
          printMessage(data, green)
        })
        .catch(e => {
          console.log(chalk.red('Error:'), e)
        })
    } else {
      printMessage(data, chalk)
    }
  },
}
