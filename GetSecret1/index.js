const rp = require('request-promise');
const getToken = function(resource, apiver, cb) {
    var options = {
        uri: `${process.env["MSI_ENDPOINT"]}/?resource=${resource}&api-version=${apiver}`,
        headers: {
            'Secret': process.env["MSI_SECRET"]
        }
    };
    rp(options)
        .then(cb);
}

module.exports = function (context, req) {
    context.log('GetSecret1 triggered');

    
    context.res = {
        // status: 200, /* Defaults to 200 */
        body: "Hello!!"
    };

    context.done();
};