'use strict';

const request = require('request');

let invoke = async (options, cb) => {
    console.log(':: Making a call to a backend service :: URL :: ', options.url);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    try {
        request(options, (error, response, body) => {

            if (response != undefined) {
                console.log(':: Received a response from the microservice ::');
                console.log(body);
                cb(null, response);
                /*
                                if (!error && (response.statusCode == '200' || response.statusCode == '201' || response.statusCode == '204')) {
                                    console.log(':: Response Body :: ' + JSON.stringify(response.body));                
                                    cb(null, response);
                                } else if (!error && (response.statusCode == '502')) {
                                    console.log(':: Error detected :: Response Body :: ' + JSON.stringify(response.body));
                                    cb('Backend error.', null);
                                } else if (!error && (response.statusCode == '504')) {
                                    console.log(':: Error detected :: Response Body :: ' + JSON.stringify(response.body));                
                                    cb('Backend error.', null);                
                                } else if (!error && (response.statusCode == '403'  || response.statusCode == '401' )) {                
                                    console.log(':: Authentication error ::');                
                                    cb('Authentication error.', null);                
                                } else if (!error && (response.statusCode == '404')) {
                                    console.log(':: NOT_FOUND ::', body);                
                                    cb('Backend error.', null);                
                                } else if (!error && (response.statusCode == '400')) {                
                                    console.log(body);                
                                    cb('Backend error.', null);                
                                } else {                
                                    console.log(':: Error caught while calling service ::');                
                                    cb(error, null);                
                                }   */
            } else {
                if (error.code == 'ENOTFOUND') {
                    console.log(':: ENOTFOUND ::');
                    cb('BACKEND_ERROR', null);
                } else if (error.code == 'ETIMEDOUT') {
                    console.log(':: ETIMEDOUT ::');
                    cb('BACKEND_ERROR', null);
                } else {
                    console.log(error);
                    cb('BACKEND_ERROR', null);
                }
            }
        });
    } catch (e) {
        console.log(':: Error in calling backend ::');
        cb('Error in calling backend.', null);
    }
};

exports.invoke = invoke;