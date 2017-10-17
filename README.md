# Accessing Key Vault Secrets from an Azure Function using Managed Service Identities

This is an [Azure Function], written in Javascript, that makes calls into [Azure Key Vault] to grab the value of a secret stored there.

The function makes use of the [Managed Service Identity] feature of Azure Function Apps to obtain an access token,and then make authenticated calls into Key Vault. 

Key Vault can be set up to grant access to the Function App's Service Identity, and allow it to access the secrets it holds.

By using Key Vault and Managed Service Identities, even if someone...

1. has access to your code (such as this repro)
2. knows the URL to your secret in Key Vault

... the Key Vault access policies would still prevent access to any calls other than those from a recognised Service Identity.

To use the Managed Service Identity, the Function App and Key Vault must be resources within an Azure Active Directory setup.

# Some Useful Links

The following links may be useful to read as you go about setting this application up:

* [How to use Azure Managed Service Identity (public preview) in App Servce and Azure Functions](https://docs.microsoft.com/en-us/azure/app-service/app-service-managed-service-identity)
* [Getting Started with Azure Key Vault](https://docs.microsoft.com/en-us/azure/key-vault/key-vault-get-started)

Key Vault API Doc links: 

* [Azure Key Vault REST API reference](https://docs.microsoft.com/en-us/rest/api/keyvault/index)
* [Azure Key Vault Docs: secret operations](https://docs.microsoft.com/en-us/rest/api/keyvault/secret-operations)
* [Azure Key Vault Docs: Get Secrets](https://docs.microsoft.com/en-us/rest/api/keyvault/getsecrets/getsecrets)

Useful Blog Posts:

* [Azure Key Vault from Azure Functions](http://www.rahulpnath.com/blog/azure-key-vault-from-azure-functions/)

Useful GitHub Issues:

* [Feature Request to retrieve Azure Function secrets from Key Vault](https://github.com/Azure/azure-webjobs-sdk/issues/746)
* [MSI_SECRET and MSI_ENDPOINT are not populated after enabling MSI](https://github.com/Azure/azure-webjobs-sdk-script/issues/2038)


# Set Up

The following describes how you can go ahead and try this code yourself. At the end of it you will have...

1. A Function App that runs the code within this repo
2. A Key Vault, containing a secret key and value

## Step 1: Create a Key Vault

The first step is to create a new Key Vault within Azure. You can do this however you like (via the portal, via the CLI, or whatever).

## Step 2: Create a Secret within the Key Vault

Once you have a Key Vault set up, you need to add a secret to it. Secrets are name/value pairs. The Function App will use a the URL of the secret to access it, and this URL will be stored within the Application Settings (i.e. the environment variables) for the Function App. This means you can call your secret whatever you like...we'll be configuring the Function app with the URL later.

In my example, I called my secret `secret1` and have it a value of `secretvalue1`.

## Step 3: Create the Function App and Deploy the Code

Create a Function App in whatever way you like (via the portal, CLI etc). 

Next, fork this repository into your own GitHub account and then point your Function App deployment configuration at your forked repo. This will allow you to auto-deploy whenever you update your repo.

The code within this repository is written in Javascript, and makes use of some npm packages. As such, the first time you deploy this code you will need to:

- open the Kudu console on this function app
- run `npm install` to download and install packages

You can [review these docs](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#node-version-and-package-management) for further details on how this is done.

## Step 4: Enable Managed Service Identity for the Function App

You should now have a Function App deployed with the code from this repo. The next step is to enable the Managed Service Identity feature for this Function App.

You can do this by visiting the Platform Features tab for the Function App within the Azure portal. Switch the "Refgister with Azure Active Directory" switch from "Off" to "On", save the setting, and you're done.

> At the time of writing, Managed Service Identity is a public preview feature of Azure Functions.

Allowing your Function App to have a Managed Service Identity means that it can then access resources from within an Azure Active Directory.

When you enable Managed Service Identity, two environment variables get set up for your Function App: `MSI_ENDPOINT` and `MSI_SECRET`. With the value of these two environment variables, it is then possible for you code to obtain a Bearer token that will allow it to access Azure Active Directory resources. In our case, we'll be contacting Key Vault.

NOTE: perhaps because this feature is still only public preview, it can take some time for these environment variables to appear.

## Step 5: Create an Access Policy within Key Vault

Now that your Function App has a Managed Service Identity it is possible to define an Access Policy within Key Vault for it.

Within your the Azure portal, you will find "Access Policies" within the Key Vault's settings. This allows you to define access policies for principals and, in this case, for the Service Identity that your Function App now has.

Click "Add" to add a policy. Click "Select principal" and search for your Function App's name.

You're given the option of picking from a template, or setting up the permissions yourself. Don't pick a template. Just select the "get" permission from the list of Secret permissions. This will allow your Function App to get secrets, but do nothing else (i.e. it can't access Keys at all, it can't list/delete/update secrets, and it can't perform any certificate operations).

Click OK to apply this access policy.

## Step 6: Set up the Application Settings for the Function App

The code within this repo looks at the Application Settings to determine which secret it should request from the Key Vault. It does this by using the URL associated with the secret. The secret's URL is obtained from Key Vault.

Within the Azure portal, open up the Key Vault and select Secrets. Then select the secret you created earlier. Finally, select the version of the secret that you want your Function App to access (secrets in Key Vault are versioned. You can access a specific version of the secret, or the top copy value). At this point, you should be able to see the Secret Identifier...a URL that can be used to access your secret's value via the Key Vault REST API. It will look something like this...


`https://[your-vault-name].vault.azure.net/secrets/[name-of-secret]/[version-guid]`

Copy this value.

The code in this repo looks for an environment variable called `SECRET1`, and expects to find the above URL as the value. So, go to your Function App in the portal, go to the Application Settings, and create a new application setting as follows:

name: `SECRET1`
value: `[the URL you copied for the Key Vault secret identifier]`


## Step 7: Testing the Function

You have now performed all of the setup required. You should have in place...

1. A Key Vault, containing a secret
1. A URL that allows access to that secret
1. A Function App with a Managed Service Identity set up (and the `MSI_ENDPOINT` and `MSI_SECRET` env variables automatically populated)
1. Access Policies, set up in Key Vault, that allow your Function App to perform `get` operations against secrets in your vault.
1. Application Settings that define `SECRET1` as having a value that you obtained from the secret identified of your Key Vault secret.

At this point, you should be able to invoke your function and have it return the value of your secret. 

Yay!

# Proving the Point

After all of this, if you want to prove that your secrets are secure in Key Vault, you can perform all of the steps above **apart from step 5** once again, but within a new Function App. In other words, create a separate Function App that has...

- the same code
- the same configuration (MSI enabled)
- the same app settings

... and then see if it can access your secrets in Key Vault. 

What you should see, if you look at the log stream for your function, is that the function sees a HTTP 403 status code when it tries to call into Key Vault (i.e. a "Forbidden, Access Denied" result). In other words, having access to the code and the URL to the secret is not enough.

You could also try changing the access policy for your original Function App. For example, remove `get` access. Again, your Function App should be prevented from accessing the secrets.

# Things to Consider

- The Azure Managed Service Identity feature is in public preview.
- The MSI_ENDPOINT and MSI_SECRET environment variables can take a while to appear within the Function App's process. 