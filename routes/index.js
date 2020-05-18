var express = require('express');
var router = express.Router();
//var request = require("request");
var Product = require('../models/product');
var Cart = require('../models/cart');
var Order = require('../models/order');
var oauthclient = require('../util/oauth');
var backendinvoke = require('../util/backend');
var paymentintentjson = require('../data/paymentintent.json');
var oAuthConfig = require('../config/ouath.json');
var paymentcalljson = require('../config/paymentconfig.json');
var paymentsubmitjson = require('../data/paymentsubmission.json');
var productjson = require('../data/products.json');
//var request = require('async-request');
const got = require('got');

/* GET home page. */
router.get('/ecommerce', function (req, res, next) {
    console.log("inside index ");
    var successMgs = req.flash('success')[0];
    console.log("successMgs -- " + successMgs);



    Product.find(function (err, docs) { //database comes with the name docs
        var productChunks = [];
        var chunkSize = 3;//in 1 row 3 items
        for (var i = 0; i < docs.length; i += chunkSize) {
            productChunks.push(docs.slice(i, i + chunkSize));
        }
        // res.render('shop/index', { title: 'Shopping cart', products: productChunks, successMgs: successMgs, noMessage: !successMgs });
        res.render('shop/index', { title: 'Shopping cart', products: productChunks, successMgs: successMgs, noMessage: !successMgs });

        //render renderes html file in shop naming index.hbs in body of layout.hbs and further writes other dynamic attributes in curly brackets
        //means that all attributes are defined in index.hbs and we are using it by modifying ourself       
    });
});

router.get('/', function (req, res, next) {
    var availableflows = {};
    availableflows.payments = "payments";
    availableflows.accounts = "accounts";
    var toplevelcategory = [{name:"prepaid",id:"1234"},{name:"voucher",id:"4568" },{name:"electricity",id:"1234"},{name:"lotto",id:"4568" }];
   //var toplevelcategory ={name:"prepaid",id:"1234"};
 //  var users = "Amit Pareek";
//res.render("index", {username: users});
   res.render('index',{toplevelcategory:toplevelcategory});
});

// here get request is used as a req. is being received  when the button is clicked   
router.get('/add-to-cart/:id', function (req, res) {//this id is that id which every product gets when it  get stored in database
    var productId = req.params.id;//if cart is non empty then return that else return empty {}
    var cart = new Cart(req.session.cart ? req.session.cart : {});

    Product.findById(productId, function (err, product) {
        if (err) {
            return res.redirect('/');
        }
        cart.add(product, product.id);
        req.session.cart = cart;
        console.log(req.session.cart);
        res.redirect('/ecommerce');
    })
});

router.get('/reduce/:id', function (req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
    cart.reduceByOne(productId);
    req.session.cart = cart;
    res.redirect('/shopping-cart');
});

router.get('/remove/:id', function (req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
    cart.removeItem(productId);
    req.session.cart = cart;
    res.redirect('/shopping-cart');
});

router.get('/shopping-cart', function (req, res, next) {
    if (!req.session.cart) {
        return res.render('shop/shopping-cart', { products: null });
    }
    var cart = new Cart(req.session.cart);
    return res.render('shop/shopping-cart', { products: cart.generateArray(), totalPrice: cart.totalPrice });
});

router.get('/checkout', isLoggedIn, function (req, res, next) {


    if (!req.session.cart) {
        return res.redirect('/shopping-cart');
    }
    var cart = new Cart(req.session.cart);
    console.log("cart ---", cart);
    var errMsg = req.flash('error')[0];
    return res.render('shop/checkout', { total: cart.totalPrice, errMsg: errMsg, noError: !errMsg });
});

router.post('/checkout', isLoggedIn, async function (req, res, next) {


    if (!req.session.cart) {
        return res.redirect('/shopping-cart');
    }
    var cart = new Cart(req.session.cart);
    // var accesstoken = await oauthclient.clientcred();
    // if (accesstoken) {
    //     accesstoken = "Bearer " + accesstoken;
    // }

    /////////////////////////////

    console.log("before light")

    var options = {
        method: 'POST',

        headers:
        {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded'
        },
        form:
        {
            grant_type: 'client_credentials',
            client_id: oAuthConfig.credentials.id,
            client_secret: oAuthConfig.credentials.secret,
            scope: 'tpp_client_credential',
        }
    };
    console.log('options::: ', options);
    // request(options, function (error, response, body) {
    //     if (error) return console.error('Failed: %s', error.message);

    //     console.log('Success: ', body);
    //    // req.flash('success', 'Successfully bought product!');
    // });
    var response = await got(oAuthConfig.url.auth.tokenHost + oAuthConfig.url.auth.tokenPath, options);

    console.log("respbody ----", JSON.parse(response.body).access_token);
    var accesstoken = JSON.parse(response.body).access_token;







    // //////////////////////////////////





    // //     console.log("Light Token in checkout " + accesstoken);



    var reqbody = paymentintentjson.config;
    var idempotency = Math.floor(Math.random() * 90000) + 10000;
    var options = {

        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-ibm-client-id": oAuthConfig.credentials.id,
            "x-ibm-client-secret": oAuthConfig.credentials.secret,
            "Authorization": "Bearer " + accesstoken,
            "x-idempotency-key": idempotency,
            "x-fapi-financial-id": "OB/2017/001"
        },

        json: reqbody,

    };
    console.log("Before final call of intent", options);
    var intentresponse = await got(paymentcalljson.payment.intent, options);
    console.log("intentresponse ----", JSON.parse(intentresponse.body));
    console.log("intentresponse ----", JSON.parse(intentresponse.body).Data.PaymentId);

    var paymentId = JSON.parse(intentresponse.body).Data.PaymentId;
    var authorizeURL = oAuthConfig.url.auth.tokenHost + oAuthConfig.url.auth.authorizePath +
        "?client_id=" + oAuthConfig.credentials.id +
        "&intentid=" + paymentId + "&scope=openid,payments&state=" + paymentId + "&itype=payments&response_type=code&redirect_uri=" + oAuthConfig.url.auth.callback;
    console.log("authorizeURL before redirect ---" + authorizeURL);
    res.redirect(authorizeURL);

    //     await backendinvoke.invoke(options, function (err, response) {
    //         console.log("response---", response.statusCode);
    //         console.log('response', response.body);
    //         var intentid = response.body.Data.ConsentId;
    //         console.log('intentid -', intentid);
    //         // req.flash('success', 'Successfully bought product!');
    //         var accesstoken = oauthclient.accesscodeflow(req, res, intentid);
    //         console.log('heavy accesstoken', accesstoken);
    //         req.session.cart = null;
    //         //nodemo   res.redirect('/');
    //     });



    //     // var stripe = require("stripe")(
    //     //     "sk_test_pVJhFSD0tie3QmfWqzusM6ib"
    //     // );

    //     // stripe.charges.create({
    //     //     amount: cart.totalPrice * 100,
    //     //     currency: "usd",
    //     //     source: req.body.stripeToken, // obtained with Stripe.js
    //     //     description: "Test Charge"
    //     // }, function(err, charge) {
    //     //     if(err) {
    //     //         req.flash('error', err.message);
    //     //         return res.redirect('/checkout');
    //     //     }
    //     //     var order = new Order({
    //     //         user: req.user,
    //     //         cart: cart,
    //     //         address: req.body.address,
    //     //         name: req.body.name,
    //     //         paymentId: charge.id
    //     //     });
    //     //     order.save(function(err, result) {
    //     //         req.flash('success', 'Successfully bought product!');
    //     //         req.session.cart = null;
    //     //         res.redirect('/');
    //     //     });
    //     // });
});

router.get('/callback', isLoggedIn, async function (req, res, next) {
    var code = req.query.code;
    const intentid = req.query.state;
    console.log("Access code --", req.query.code);
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


    // const oauth2 = require('simple-oauth2').create(credentials);
    try {

        const tokenConfig = {
            code: req.query.code,
            redirect_uri: oAuthConfig.url.auth.callback,
            scope: oAuthConfig.scope.payments,
        };
        console.log("tokenConfig ---", tokenConfig);

        var options = {
            method: 'POST',
            headers:
            {
                accept: 'application/json',
                'content-type': 'application/x-www-form-urlencoded'
            },
            form:
            {
                grant_type: 'authorization_code',
                client_id: oAuthConfig.credentials.id,
                client_secret: oAuthConfig.credentials.secret,
                code: code,
                redirect_uri: 'http://localhost:3000/callback',
                scope: 'payments',
            }
        };
        console.log('options::: ', options);


        var response = await got(oAuthConfig.url.auth.tokenHost + oAuthConfig.url.auth.tokenPath, options);
        console.log('Heavy token::: ', response);

        console.log("Heavytoken ----", JSON.parse(response.body).access_token);
        var accesstoken = JSON.parse(response.body).access_token;
        console.log("Heavytoken1 ----", JSON.parse(response.body).access_token);
        var idempotency = Math.floor(Math.random() * 90000) + 10000;

        var paymentreqbody = paymentsubmitjson.config;

        paymentreqbody.Data.PaymentId = intentid;
        console.log("paymentreqbody ----", paymentreqbody);

        var paymentoptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-ibm-client-id": oAuthConfig.credentials.id,
                "x-ibm-client-secret": oAuthConfig.credentials.secret,
                "Authorization": "Bearer " + accesstoken,
                "x-idempotency-key": idempotency,
                "x-fapi-financial-id": "OB/2017/001"
            },

            json: paymentreqbody,

        };
        console.log("Before final call of intent", paymentoptions);

        var paymentresposne = await got(paymentcalljson.payment.domesticpayment, paymentoptions);
        console.log('response', paymentresposne.body);
        var paymentsubmissionid = JSON.parse(paymentresposne.body).Data.PaymentSubmissionId;
        res.render('shop/finalpaymentstatus', { title: 'Shopping cart', paymentsubmissionid:paymentsubmissionid });

        // request(options, function (error, response, body) {
        //     if (error) return console.error('Failed: %s', error.message);

        //     console.log('Success: ', body);
        //     req.flash('success', 'Successfully bought product!');
        //     req.session.cart = null;

        //     //call for payment submission
        //     var accesstoken ="Bearer "+JSON.parse(body).access_token;
        //     console.log("accesstoken ---",accesstoken);
        //     var reqbody = paymentsubmitjson.config;
        //     reqbody.Data.ConsentId=intentid;
        //     var options = {
        //         url: paymentcalljson.payment.domesticpayment,
        //         method: "POST",
        //         headers: {
        //             "Content-Type": "application/json",
        //             "x-ibm-client-id": oAuthConfig.credentials.id,
        //             "x-ibm-client-secret": oAuthConfig.credentials.secret,
        //             "Authorization": accesstoken
        //         },
        //         json: true,
        //         body: reqbody
        //     };

        //     console.log("Before final call ", options);

        //     backendinvoke.invoke(options, function (err, response) {
        //         console.log("response---", response.statusCode);
        //         console.log('response', response.body);

        //         res.render('shop/finalpaymentstatus', { title: 'Shopping cart'});
        //     });




        //     //make call to the 

        // });



    } catch (error) {
        console.log(error.response.body);
    }
});

module.exports = router;

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.session.oldUrl = req.url;
    res.redirect('/user/signin');
}