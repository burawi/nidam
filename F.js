module.exports = function (extra) {
    var exports = {
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
