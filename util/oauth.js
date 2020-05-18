var oAuthConfig = require('../config/ouath.json');


module.exports.clientcred = async function () {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  const credentials = {
    client: {
      id: oAuthConfig.credentials.id,
      secret: oAuthConfig.credentials.secret
    },
    auth: {
      tokenHost: oAuthConfig.url.auth.tokenHost,
      tokenPath: oAuthConfig.url.auth.tokenPath

    }
  };
  console.log("light token call detail --",credentials);
  const oauth2 = require('simple-oauth2').create(credentials);

  const tokenConfig = {
    scope: oAuthConfig.scope.tpp_client_credentials
  };

  try {
    const result = await oauth2.clientCredentials.getToken(tokenConfig);
    const accessToken = oauth2.accessToken.create(result);
    console.log("accessToken --", accessToken.token.access_token);
    return accessToken.token.access_token;
  } catch (error) {
    return error;
    console.log('Access Token error', error.message);
  }
}

module.exports.accesscodeflow = async function (req, res, intentid) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'


  const credentials = {
    client: {
      id: oAuthConfig.credentials.id,
      secret: oAuthConfig.credentials.secret
    },
    auth: {
      tokenHost: oAuthConfig.url.auth.tokenHost,
      tokenPath: oAuthConfig.url.auth.tokenPath,
      authorizePath: oAuthConfig.url.auth.authorizePath,
    }
  };


  const oauth2 = require('simple-oauth2').create(credentials);
  const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: oAuthConfig.url.auth.callback,
    scope: oAuthConfig.scope.payments,
    state: intentid,
    consentid: intentid
  });
  console.log("authorizationUri --" + authorizationUri);
  res.redirect(authorizationUri);

}



