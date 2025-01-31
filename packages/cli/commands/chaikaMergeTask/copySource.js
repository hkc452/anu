const fs = require('fs-extra');
const path = require('path');
const cwd = process.cwd();
const glob = require('glob');
const downLoadDir = path.join(cwd, '.CACHE/download');
const mergeDir = path.join(cwd, '.CACHE/nanachi');
const mergeFilesQueue = require('./mergeFilesQueue');

//这些文件对项目编译时来说，没啥用
const ignoreFiles = [
    'package-lock.json',
];

const docFilesReg = /\.md$/;
const configFileReg = /\w+Config\.json$/;
const reactFileReg = /React\w+\.js$/;

//这些文件需要经过其他处理
const mergeFiles = [
    'app.json',
    'app.js',
    'package.json'
];

//这种文件全局只能有一个, 不参与合并
const lockFiles = [
    'project.config.json'
];



function isIgnoreFile(fileName){
    return ignoreFiles.includes(fileName) 
        || mergeFiles.includes(fileName)
        || lockFiles.includes(fileName)
        || configFileReg.test(fileName)
        || reactFileReg.test(fileName)
        || docFilesReg.test(fileName);
}

function isMergeFile(fileName){
    return mergeFiles.includes(fileName)
        || configFileReg.test(fileName);
}

function isLockFile(fileName) {
    return lockFiles.includes(fileName);
}

function copyCurrentProject() {
    let projectDirName = cwd.replace(/\\/g, '/').split('/').pop();
    let files = glob.sync( './!(node_modules|dist)', {
        //nodir: true
    });
    let allPromiseCopy = files.map(function(el){
        let src = path.join(cwd, el);
        let dist = path.join(downLoadDir, projectDirName, el);
        if (/\.\w+$/.test(el)) {
            fs.ensureFileSync(dist);
            return fs.copyFile(src, dist);
        } else {
            fs.ensureDirSync(dist);
            return fs.copy(src, dist);
        }
    });
    return Promise.all(allPromiseCopy);
}

function copyOtherProject() {
    
    let files = glob.sync( downLoadDir + '/**', {nodir: true});
    files = files.filter((file)=>{
        let fileName = path.parse(file).base;
        if (isIgnoreFile(fileName)) {
            if (isMergeFile(fileName) || isLockFile(fileName) ) {
                mergeFilesQueue.add(file);
            }
            return false;
        } else {
            return true;
        }
    });

    let allPromiseCopy = files.map(function(file){
        let dist = '';
        file = file.replace(/\\/g, '/');
        if (/\/source\//.test(file)) {
            dist = path.join(mergeDir, 'source', file.split('/source/').pop());
        } else {
            // e.g project.config.json...
            dist = path.join(mergeDir, file.split('/').pop());
        }
        fs.ensureFileSync(dist);
        return fs.copyFile(file, dist);
    });
   
    return Promise.all(allPromiseCopy);
}

module.exports = function(){
    fs.emptyDirSync(mergeDir);
    return copyCurrentProject()
        .then(function(){
            return copyOtherProject();
        })
        .then(function(){
            return Promise.resolve(1);
        })
        .catch(function(err){
            return Promise.reject(err);
        });
};