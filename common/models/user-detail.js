'use strict';

var app = require('../../server/server');
var mailGun = require('../mailgun');
var handlers = {};
var User;

handlers.sendResetMail = (userInstance) => {
  console.log(userInstance);
  var data = {
    from: 'Admin <admin@domain.com>',
    to: userInstance.email,
    subject: 'Reset Password',
    text: `
      Please reset your password at
      http://${app.get('host')}:${app.get('port')}/reset?token=${userInstance.accessToken.id}`
  };

  mailGun.messages().send(data,(err, body) => {
    if(err) console.log('Unable to send create email', err);
    console.log('Reset done', body, data);
  });
}

app.post('/api/ApiUsers/reset-password', function(req, res, next) {
  if (!req.query.accessToken) return res.sendStatus(401);
  app.models.AccessToken.findById(req.query.accessToken, (err, token) => {
    User.findById(token.userId, function(err, user) {
      if (err) return res.sendStatus(404);
      user.updateAttribute('password', req.body.password, function(err, user) {
        if (err) return res.sendStatus(404);
        res.send(200);
      });
    });
  });
});


module.exports = function(UsersDetail) {
  //console.log("MMM000");
  const User = UsersDetail;
  UsersDetail.validatesInclusionOf('accountType', {in: ['Customer', 'Provider']});
  UsersDetail.validatesUniquenessOf('email', {message: 'Email is already present.'});
  UsersDetail.validatesUniquenessOf('username', {message: 'Username is already taken.'});
  UsersDetail.on('resetPasswordRequest', handlers.sendResetMail);

  User.search = function(id,req,cb){
    var filter = {where: {or:[{username:id},{email:id}]}};
    User.findOne(filter, function(err, cbm) {
      cb(null,cbm);
    });
  };
  User.remoteMethod('search',{
    description: "grant read only access to everyone for user name db query",
    accepts:[{
      arg:'id',
      type: 'any',
      required: false
    },
    {arg: 'req', type: 'object', http: {source: 'req'}}
    ],
    http:{
      path:'/search/:id',
      verb: 'get'
    },
    returns:{
      arg:'ack',
      type:'any'
    }
  });

};

//https://github.com/strongloop/loopback/issues/559
//https://loopback.io/doc/en/lb2/AccessToken-invalidation.html
