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
            };
            params = Object.assign({}, params, extra, data);
            return params;
        },
        render: function (req, res, page, data) {
            var params = exports.viewParams(req, data);
            var html = page.render(params);
            res.send(html);
        }
    };

    return exports;
}
