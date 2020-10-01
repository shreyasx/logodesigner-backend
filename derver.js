const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const knex = require('knex');
const bcrypt = require('bcrypt');
const cloudinary = require('cloudinary');

app.set('view engine', 'ejs');
app.use(express.static('./public'));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false, parameterLimit: 50000 }));
app.use(bodyParser.json({ limit: "50mb" }));

const postgres = knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    user: '',
    password: '',
    database: 'kedar'
  }
});

cloudinary.config({
  cloud_name: 'shrey',
  api_key: '672841614512178',
  api_secret: '40oJY_qIU7JNeB0Zkjwgaw-zliA'
});

const insertHashtags = (id, hashtags) => {
  while (hashtags.length > 0) {
    const temp = hashtags.pop();
    postgres.select('hashtag_id').from('hashtags')
      .where('hashtag_name', '=', temp)
      .then(hash => {
        if (hash.length == 0) {
          postgres('hashtags').insert({ hashtag_name: temp }).returning('hashtag_id')
            .then(hid => {
              postgres('junction_table').insert({
                logo_id: id[0],
                hashtag_id: hid[0]
              }).then(() => console.log("inserted")).catch(console.log);
            });
        } else {
          postgres('junction_table').insert({
            logo_id: id[0],
            hashtag_id: hash[0].hashtag_id
          }).then(() => console.log("hash exis")).catch(console.log);
        }
      });
  }
};

app.get('/', (req, res) => res.json('hey there!'));

app.get('/admin', (req, res) => res.render(`login`));

app.post('/upload', (req, res) => {
  const { name, desc, category, hashtags, url } = req.body;
  cloudinary.v2.uploader.upload(url, function (err, result) {
    if (err) {
      console.log(err);
      res.status(400);
    }

    postgres.select('*').from('categories')
      .where('category_name', '=', category)
      .then(cat => {
        if (cat.length == 0) {
          postgres('categories').insert({ category_name: category })
            .then(() => {
              postgres.select('*').from('categories')
                .where('category_name', '=', category)
                .then(c => {
                  postgres('logos').insert({
                    name: name,
                    description: desc,
                    category: c[0].category_id,
                    logo_img_url: result.secure_url
                  }).then(() => res.json('inserted')).catch(console.log);
                }).catch(console.log);
            });
        } else {
          postgres('logos').insert({
            name: name,
            description: desc,
            category: cat[0].category_id,
            logo_img_url: result.secure_url
          }).returning('logo_id').then(ins => insertHashtags(ins, hashtags))
            .then(() => res.json('inserted')).catch(console.log);
        }
      }).catch(() => res.status(200));
  });
});

app.get('/prods', (req, res) => {
  postgres.select('*').from('logos').then(data => res.json(data));
});

app.post('/signin', (req, res) => {
  const { username, password } = req.body;
  postgres.select('email', 'hash').from('login').where('email', '=', username)
    .then(data => {
      bcrypt.compare(password, data[0].hash, function (err, result) {
        if (result) res.render('index');  // kedar@ ked
        else res.render("login", { msg: "incorrect credentials" });
      });
    }).catch(e => {
      res.render("login", { msg: "incorrect credentials" });
    });
});

app.listen(3001, () => {
  console.log('app on 3001');
});