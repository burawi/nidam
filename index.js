var express = require('express');
var pl = require('pug-layout');
var fs = require('fs');
var path = require('path');
var capitalize = require('capitalize');

var forEachModule = function(fn) {
    var modulesDir = fs.readdirSync('./app_modules');
    modulesDir.forEach(function(element) {
        var stat = fs.lstatSync(path.resolve('.', 'app_modules', element));
        if (stat.isDirectory()) {
            fn(element);
        } else if (stat.isFile()) {
            // console.log(element+': belongs to main module');
        }
    });
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
    }else {
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

var loadViewsOf = function (moduleName, type) {
    var views = {};
    forEachFileOf(moduleName, 'views/'+type, function (fileName,pathToFile) {
        var plObjectName = capitalize(type).slice(0, -1);
        var view = new pl[plObjectName](pathToFile)
        forEachModule(function (moduleName) {
            forEachFileOf(moduleName,'views/components',function (fileName,pathToFile) {
                view.includeAtTop(pathToFile);
            });
        });
        views[path.basename(pathToFile,'.pug')] = view;
    });
    return views;
}

var loadCommonFiles = function(fileName, extra) {
    var files = {};
    forEachModule(function(moduleName) {
        try {
            files[moduleName] = fileOf(moduleName, fileName, extra);
        } catch (e) {}
    });
    return files;
}

var getModulePages = function (moduleName) {
    var res = {};
    try {
        var pagesDir = fs.readdirSync(path.resolve('.', 'app_modules', moduleName, "pages"));
        pagesDir.forEach(function(element) {
            var stat = fs.lstatSync(path.resolve('.', 'app_modules', moduleName, element));
            if (stat.isDirectory()) {
            } else if (stat.isFile()) {
                try {
                    res.push(new pl.Page(path.resolve('.', 'app_modules', moduleName, element)))
                } catch (e) { }
            }
        });
    } catch (e) { }
}

var loadModule = function(moduleName, bag) {
    var module = {
        prefix: '/' + moduleName,
        router: fileOf(moduleName, 'routes', bag),
        client: './app_modules/' + moduleName + '/client',
    };
    return module;
}

var loadAppModules = function(app, extra) {
    var bag = extra;
    bag.nidam = require('./helpers.js')(extra);
    bag.app = app;
    forEachModule(function(moduleName) {
        bag[moduleName] = {
            conf: fileOf(moduleName, 'conf', extra),
            pages: getModulePages(moduleName)
        }
        var moduleArgs = extra;
        moduleArgs[moduleName] = bag[moduleName];
        bag[moduleName].middlewares = fileOf(moduleName, 'middlewares', moduleArgs);
        bag[moduleName].helpers = fileOf(moduleName, 'helpers', moduleArgs);
    });
    bag.root = bag[''];
    delete bag[''];
    var modules = [];
    forEachModule(function(moduleName) {
        modules.push(loadModule(moduleName, bag));
    });
    return modules;
}

module.exports = {
    use: function(app, args) {
        var bag = {};
        bag.app = app;
        bag.E = args;
        bag.nidam = require('./F.js')(bag.E);
        var checkpointArgs = bag;
        forEachModule(function (moduleName) {
            bag[moduleName] = {
                conf: fileOf(moduleName,'conf.js', checkpointArgs),
                V: {
                    L: loadViewsOf(moduleName, 'layouts'),
                    P: loadViewsOf(moduleName, 'pages')
                }
            };
            if(bag[moduleName].conf.prefix === undefined){
                bag[moduleName].conf.prefix = moduleName;
            }
        });
        checkpointArgs = bag;
        forEachModule(function (moduleName) {
            bag[moduleName].F = fileOf(moduleName,'F.js', checkpointArgs, bag[moduleName].conf);
        });
        forEachModule(function (moduleName) {
            var pathToModule = path.resolve('.', 'app_modules', moduleName)
            if (fs.existsSync(pathToModule + '/index.js')) {
                require(pathToModule)(bag, bag[moduleName]);
            }
            app.use(bag[moduleName].conf.prefix, express.static(path.resolve('.', 'app_modules', moduleName, 'client')));
        });
    }
}
