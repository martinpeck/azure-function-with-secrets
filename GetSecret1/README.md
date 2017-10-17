# GetSecret1

First things first....this code is far from production ready. It's a demo, and nothing else. It's also written with a lot of logging, almost no error handling, and somewhat verbosely. It's verbose because I wanted to make sure that the entire process was explict and clear.

## How it Works

- The entry point to the function is the exported function.
- After logging some info from the `context` object, the function grabs the value of `SECRET1` from the environment. This should be the Secret Identifier for the secret you want to access in Key Vault. It's a URL that'll look something like this...

`https://[your-vault-name].vault.azure.net/secrets/[your-secret-name]/[guid-version]`

- `getADTokenForVaultAsync` is called:
    - this function uses the `MSI_ENDPOINT` environment variable to make a call that will return an access token for Active Directory resources
    - the `MSI_SECRET` environment variable value is added to the headers of the HTTP call
    - we want to access Key Vault, so we ask for a token that can access a resource of type `https://vault.azure.net`
    - the code uses the request-promise npm package to make these calls
    - what's returned from this function is a JSON object that will look something like this...

```
{
    "access_token": "eyJ0eXAi…",
    "expires_on": "09/14/2017 00:00:00 PM +00:00",
    "resource": "https://vault.azure.net",
    "token_type": "Bearer"
}
```

- with the token in hand, `getSecretFromVaultAsync` is invoked:
    - a simple HTTP GET request is made, using the secret's URL as the end point.
    - the API version is tacked onto the end of the URL
    - the token returned from `getADTokenForVaultAsyc` is added as a bearer token to the call
    - what's returned from Key Vault is a JSON object that contains a `value` attribute

- finally, the secret's `value` is returned
