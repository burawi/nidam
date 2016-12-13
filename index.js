var express = require('express');
var Layout = require('pug-layout');
var fs = require('fs');
var path = require('path');

var filePathOf = function (moduleName,fileName) {
    return path.resolve('.','app_modules', moduleName, fileName);
}

var fileOf = function (moduleName,fileName,args) {
    return require(filePathOf(moduleName, fileName))(args);
}

var forEachModule = function (fn) {
    var modulesDir = fs.readdirSync('./app_modules');
    fn('');
    modulesDir.forEach(function (element) {
        var stat = fs.lstatSync(path.resolve('.','app_modules',element));
        if(stat.isDirectory()){
            fn(element);
        }else if(stat.isFile()){
            // console.log(element+': belongs to main module');
        }
    });
}

var loadCommonFiles = function (fileName, extra) {
    var files = {};
    try {
        files.root = fileOf('', fileName, extra);
    } catch (e) { }
    forEachModule(function (moduleName) {
        try {
            files[moduleName] = fileOf(moduleName, fileName, extra);
        } catch (e) { }
    });
    return files;
}

var loadModule = function (moduleName, bag) {
    var module =  {
        prefix: '/'+moduleName,
        router: fileOf(moduleName, 'routes', bag),
        client: './app_modules/'+moduleName+'/client',
    };
    return module;
}

var loadAppModules = function (app, extra) {
    var bag = extra;
    bag.nidam = require('./helpers.js')(extra);
    forEachModule(function (moduleName) {
        bag[moduleName] = {
            conf: fileOf(moduleName,'conf',extra)
        }
        var moduleArgs = extra;
        moduleArgs[moduleName] = bag[moduleName];
        bag[moduleName].middlewares = fileOf(moduleName,'middlewares',moduleArgs);
        bag[moduleName].helpers = fileOf(moduleName,'helpers',moduleArgs);
    });
    bag.app = app;
    var modules = [];
    forEachModule(function (moduleName) {
        modules.push(loadModule(moduleName, bag));
    });
    return modules;
}

module.exports = {
    use: function (app,extra,layouts) {
        // Configure Layouts
        if(layouts !== undefined){
            for (var layout in layouts) {
                if (layouts.hasOwnProperty(layout)) {
                    layouts[layout] = new Layout(layouts[layout]);
                    forEachModule(function (moduleName) {
                        try {
                            layouts[layout].includeAtTop(filePathOf(moduleName, 'components.pug'))
                        } catch (e) { }
                    });
                }
            }
            extra.layouts = layouts;
        }

        var appModules = loadAppModules(app, extra);
        appModules.forEach(function (module) {
            app.use(module.prefix, module.router);
            app.use(module.prefix, express.static(module.client));
        });
    }
}
