const rp = require('request-promise');

// This function makes a request to teh MSI_ENDPOINT (supplied by the Azure Functions 
// runtime for any Function App with a managed identity) to obtain an access token for 
// the Azure Vault resource, and returns a promise
const getADTokenForVaultAsync = () => {
    
    const vaultResourceUrl = 'https://vault.azure.net/';
    const apiVersion = '2017-09-01';

    var options = {
        uri: `${process.env["MSI_ENDPOINT"]}/?resource=${vaultResourceUrl}&api-version=${apiVersion}`,
        headers: {
            'Secret': process.env["MSI_SECRET"]
        }
    };

    return rp(options);
}

// given an access token and a secretUrl, this function returns the value of the secret
const getSecretFromVaultAsync = (token, secretUrl) => {

    var options = {
        url: secretUrl,
        headers : {
            'Authorization' : `Bearer ${token}`
        }
    };

    return rp(options);
}

const logDiagnostics = (context) => {
    context.log(`MSI_ENDPOINT: ${process.env.MSI_ENDPOINT}`);
    context.log(`MSI_SECRET: ${process.env.MSI_SECRET}`);
    context.log(`SECRET1: ${process.env.SECRET1}`);
}

module.exports = function (context, req) {
    
    logDiagnostics(context);

    const secretUrl = process.env["SECRET1"];
    context.log(`Accessing secretUrl:${secretUrl}`);

    getADTokenForVaultAsync()
        .then( token_response => {
            context.log(`token_response: ${token_response}`);
            token = token_response.access_token;
            context.log(`token: ${token}`);

            getSecretFromVaultAsync(token, secretUrl)
            .then( resp => {
                context.log(response)
                context.res = response
                context.done()
            })
            .catch( err => {
                context.log(err);
                context.done("Unable to access secret")
            })
        })
        .catch( err => {
            context.log(err);
            context.done("Unable to obtain AD token to access Key Vault");
        })
};