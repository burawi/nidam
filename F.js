module.exports = function (extra) {
    var exports = {
        origin: function(url){
            url = url.replace(/\/[\w%]+/g,"/..");
            url = url.replace(/\/$/g,"");
            return url;
        },
        viewParams: function (req, data) {
            var params = {
                req: req,
                authenticated: (req.user) ? true : false,
                origin: exports.origin(req.baseUrl+req.path),
            };
            params = Object.assign({}, params, extra, data);
            return params;
        }
    };

    return exports;
}
