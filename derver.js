const express = require('express');
const bodyParser = require('body-parser');
var mustacheExpress = require('mustache-express');
const app = express();
const cors = require('cors');
const knex = require('knex');
const bcrypt = require('bcrypt');
const cloudinary = require('cloudinary');

app.set('view engine', 'mustache');
app.use('/public/', express.static('./public'));
app.engine('html', mustacheExpress());
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false, parameterLimit: 50000 }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(cors());

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
              }).then().catch(console.log);
            });
        } else {
          postgres('junction_table').insert({
            logo_id: id[0],
            hashtag_id: hash[0].hashtag_id
          }).then().catch(console.log);
        }
      });
  }
};

app.get('/', (req, res) => res.render('login.html'));

app.get('/hashtags', (req, res) => {
  if (req.query.id) {
    postgres('logos')
      .join('junction_table', 'logos.logo_id', '=', 'junction_table.logo_id')
      .join('hashtags', 'junction_table.hashtag_id', '=', 'hashtags.hashtag_id')
      .select('logos.name', 'hashtags.hashtag_name')
      .where('logos.logo_id', '=', req.query.id)
      .then(r => res.json(r)).catch(console.log);
  } else {
    postgres('logos')
      .join('junction_table', 'logos.logo_id', '=', 'junction_table.logo_id')
      .join('hashtags', 'junction_table.hashtag_id', '=', 'hashtags.hashtag_id')
      .select('logos.name', 'hashtags.hashtag_name')
      .then(r => res.json(r)).catch(console.log);
  }
});

app.get('/categories', (req, res) => {
  if (req.query.name) {
    postgres('logos')
      .join('categories', 'logos.category', '=', 'categories.category_id')
      .select('logos.name', 'logos.description', 'categories.category_name',
        'logos.logo_img_url').where('categories.category_name', '=', req.query.name)
      .then(resp => res.json(resp));
  } else {
    res.json("id kon bapui ghaltalo?");
  }
});

app.get('/search', (req, res) => {
  if (req.query.hash) {
    postgres('logos')
      .join('junction_table', 'logos.logo_id', '=', 'junction_table.logo_id')
      .join('hashtags', 'junction_table.hashtag_id', '=', 'hashtags.hashtag_id')
      .join('categories', 'logos.category', '=', 'categories.category_id')
      .select('logos.name', 'logos.description', 'categories.category_name',
        'logos.logo_img_url').where('hashtags.hashtag_name', '=', req.query.hash)
      .then(r => res.json(r)).catch(console.log);
  } else {
    postgres('hashtags').where('hashtag_name', 'like', '%' + req.query.query + '%')
      .then(resp => res.json(resp.map(x => x.hashtag_name)));
  }
});

app.get('/empty', (req, res) => {
  postgres('logos').del()
    .then(() => postgres('hashtags').del())
    .then(() => postgres('categories').del())
    .then(() => res.json("EMPTIED!"));
});

app.post('/upload', (req, res) => {
  const { name, desc, category, hashs, url } = req.body;
  const hashtags = hashs.split(' ');
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
                  logo_img_url: url
                }).returning('logo_id').then(ins => insertHashtags(ins, hashtags))
                  .then(() => res.status(200)).catch(console.log);
              }).catch(console.log);
          });
      } else {
        postgres('logos').insert({
          name: name,
          description: desc,
          category: cat[0].category_id,
          logo_img_url: url
        }).returning('logo_id').then(ins => insertHashtags(ins, hashtags))
          .then(() => res.status(200)).catch(console.log);
      }
    }).catch(() => res.status(400));
});

app.get('/logos', (req, res) => {
  if (req.query.id) {
    postgres('logos')
      .join('categories', 'logos.category', '=', 'categories.category_id')
      .select('logo_id', 'logos.name', 'logos.description', 'categories.category_name',
        'logos.logo_img_url').where('logos.logo_id', '=', req.query.id)
      .then(r => res.json(r));
  } else {
    postgres('logos')
      .join('categories', 'logos.category', '=', 'categories.category_id')
      .select('logo_id', 'logos.name', 'logos.description', 'categories.category_name',
        'logos.logo_img_url')
      .then(r => res.json(r));
  }
});

app.get('/add', (req, res) => res.render('add.html'));

app.get('/delete', (req, res) => res.render('delete.html'));

app.post('/delete', (req, res) => {
  postgres.select('*').from('logos').where('logo_id', '=', req.body.id)
    .then(resp => {
      if (resp.length > 0)
        postgres('logos').where('logo_id', req.body.id).del()
          .then(() => res.json("wow")).catch(console.log);
      else res.json("Wrong id");
    });
});

app.post('/signin', (req, res) => {
  const { username, password } = req.body;
  postgres.select('email', 'hash').from('login').where('email', '=', username)
    .then(data => {
      bcrypt.compare(password, data[0].hash, function (err, result) {
        if (result) res.render('choice.html');  // kedar@ ked
        else res.render("login.html");
      });
    }).catch(e => {
      res.render("login.html");
    });
});

app.listen(3001, () => {
  console.log('app on 3001');
});