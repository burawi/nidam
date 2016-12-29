var express = require('express');
var pl = require('pug-layout');
var fs = require('fs');
var path = require('path');
var capitalize = require('capitalize');

var loadModules = function () {
    // Sorting was inspired by this SO answer: http://stackoverflow.com/a/1069840/2952266
    var res = [];
    var modulesDir = fs.readdirSync('./app_modules');
    modulesDir.forEach(function(element) {
        var modulePath = path.resolve('.', 'app_modules', element);
        var stat = fs.lstatSync(modulePath);
        if (stat.isDirectory()) {
            var confPath = filePathOf(element,'conf.js');
            var zindex = (fs.existsSync(confPath)) ? require(confPath)().zindex : 0;
            res.push([ element, zindex || 0]);
        }
    });
    res.sort(function(a, b) {
        return b[1] - a[1]
    });
    for (var i = 0; i < res.length; i++) {
        res[i] = res[i][0];
    }
    return res;
}

var filePathOf = function(moduleName, fileName) {
    return path.resolve('.', 'app_modules', moduleName, fileName);
}

var fileOf = function(moduleName, fileName, ...args) {
    var pathToFile = filePathOf(moduleName, fileName);
    if (fs.existsSync(pathToFile)) {
        if(args[0] == 'JSON'){
            return require(pathToFile);
        }else {
            return require(pathToFile)(...args);
        }
    } else {
        return function(){};
    }
}

var forEachFileOf = function (moduleName, dirName, fn) {
    var dirPath = path.resolve('.', 'app_modules', moduleName, dirName);
    if(fs.existsSync(dirPath)){
        var filesDir = fs.readdirSync(path.resolve('.', 'app_modules', moduleName, dirName));
        filesDir.forEach(function(element) {
            var pathToElement = path.resolve('.', 'app_modules', moduleName, dirName, element);
            var stat = fs.lstatSync(pathToElement);
            if (stat.isFile()) {
                fn(element,pathToElement);
            }
        });
    }
}

var loadViewsOf = function (moduleName, type, modules) {
    var views = {};
    forEachFileOf(moduleName, 'views/'+type, function (fileName,pathToFile) {
        var plObjectName = capitalize(type).slice(0, -1);
        var view = new pl[plObjectName](pathToFile)
        modules.forEach(function (moduleName) {
            forEachFileOf(moduleName,'views/components',function (fileName,pathToFile) {
                view.includeAtTop(pathToFile);
            });
        });
        views[path.basename(pathToFile,'.pug')] = view;
    });
    return views;
}

module.exports = {
    use: function(app, args) {
        var bag = {};
        bag.app = app;
        bag.E = args;
        bag.nidam = require('./F.js')(bag);
        var checkpointArgs = bag;
        var modules = loadModules();
        modules.forEach(function (moduleName) {
            bag[moduleName] = {
                conf: fileOf(moduleName,'conf.js', checkpointArgs),
                V: {
                    L: loadViewsOf(moduleName, 'layouts', modules),
                    P: loadViewsOf(moduleName, 'pages', modules)
                }
            };
            if(bag[moduleName].conf.prefix === undefined){
                bag[moduleName].conf.prefix = moduleName;
            }
        });
        checkpointArgs = bag;
        modules.forEach(function (moduleName) {
            bag[moduleName].F = fileOf(moduleName,'F.js', checkpointArgs, bag[moduleName].conf);
        });
        modules.forEach(function (moduleName) {
            var pathToModule = path.resolve('.', 'app_modules', moduleName)
            if (fs.existsSync(pathToModule + '/index.js')) {
                require(pathToModule)(bag, bag[moduleName]);
            }
            app.use('/'+bag[moduleName].conf.prefix, express.static(path.resolve('.', 'app_modules', moduleName, 'client')));
        });
    }
}
