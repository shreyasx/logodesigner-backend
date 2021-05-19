const express = require("express");
var mustacheExpress = require("mustache-express");
const app = express();
const cors = require("cors");
const knex = require("knex");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary");
const cookieParser = require("cookie-parser");
const session = require("express-session");

app.set("view engine", "mustache");
app.use("/public/", express.static("./public"));
app.engine("html", mustacheExpress());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(cookieParser());
app.use(
	session({
		secret: "A complicated string.",
		saveUninitialized: true,
		resave: false,
	})
);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

const postgres = knex({
	client: "pg",
	connection: {
		connectionString: process.env.DATABASE_URL,
		ssl: true,
	},
});

const removeDuplicates = (originalArray, prop) => {
	var newArray = [];
	var lookupObject = {};

	for (var i in originalArray)
		lookupObject[originalArray[i][prop]] = originalArray[i];

	for (i in lookupObject) newArray.push(lookupObject[i]);

	return newArray;
};

cloudinary.config({
	cloud_name: process.env.CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const insertHashtags = (id, hashtags) => {
	while (hashtags.length > 0) {
		const temp = hashtags.pop();
		postgres
			.select("hashtag_id")
			.from("hashtags")
			.where("hashtag_name", "=", temp)
			.then(hash => {
				if (hash.length == 0) {
					postgres("hashtags")
						.insert({ hashtag_name: temp })
						.returning("hashtag_id")
						.then(hid => {
							postgres("junction_table")
								.insert({
									logo_id: id[0],
									hashtag_id: hid[0],
								})
								.then()
								.catch(console.log);
						});
				} else {
					postgres("junction_table")
						.insert({
							logo_id: id[0],
							hashtag_id: hash[0].hashtag_id,
						})
						.then()
						.catch(console.log);
				}
			});
	}
};

app.get("/", (req, res) => res.render("login.html"));

app.get("/allcategs", (req, res) => {
	postgres("logos")
		.join("categories", "logos.category", "=", "categories.category_id")
		.select("categories.category_name")
		.then(re => removeDuplicates(re, "category_name"))
		.then(r => r.map(x => x.category_name))
		.then(resp => res.json(resp))
		.catch(console.log);
});

app.get("/categories", (req, res) => {
	if (req.query.name) {
		postgres("logos")
			.join("categories", "logos.category", "=", "categories.category_id")
			.select(
				"logos.name",
				"logos.description",
				"categories.category_name",
				"logos.logo_img_url"
			)
			.where("categories.category_name", "=", req.query.name)
			.then(resp => res.json(resp));
	} else {
		res.json("id kon bapui ghaltalo?");
	}
});

app.get("/search", (req, res) => {
	postgres("logos")
		.join("junction_table", "logos.logo_id", "=", "junction_table.logo_id")
		.join("hashtags", "junction_table.hashtag_id", "=", "hashtags.hashtag_id")
		.join("categories", "logos.category", "=", "categories.category_id")
		.select(
			"logos.name",
			"logos.description",
			"categories.category_name",
			"logos.logo_img_url"
		)
		.where("hashtags.hashtag_name", "like", "%" + req.query.hash + "%")
		.then(r => removeDuplicates(r, "name"))
		.then(resp => res.json(resp))
		.catch(console.log);
});

// app.get("/empty", (req, res) => {
// 	postgres("logos")
// 		.del()
// 		.then(() => postgres("hashtags").del())
// 		.then(() => postgres("categories").del())
// 		.then(() => res.json("EMPTIED!"));
// });

app.post("/upload", (req, res) => {
	const { name, desc, category, hashs, url } = req.body;
	const hashtags = hashs.split(" ");
	postgres
		.select("*")
		.from("categories")
		.where("category_name", "=", category)
		.then(cat => {
			if (cat.length == 0) {
				postgres("categories")
					.insert({ category_name: category })
					.then(() => {
						postgres
							.select("*")
							.from("categories")
							.where("category_name", "=", category)
							.then(c => {
								postgres("logos")
									.insert({
										name: name,
										description: desc,
										category: c[0].category_id,
										logo_img_url: url,
									})
									.returning("logo_id")
									.then(ins => insertHashtags(ins, hashtags))
									.then(() => res.status(200))
									.catch(console.log);
							})
							.catch(console.log);
					});
			} else {
				postgres("logos")
					.insert({
						name: name,
						description: desc,
						category: cat[0].category_id,
						logo_img_url: url,
					})
					.returning("logo_id")
					.then(ins => insertHashtags(ins, hashtags))
					.then(() => res.status(200).json("Inserted successfully."))
					.catch(console.log);
			}
		})
		.catch(() => res.status(400));
});

app.get("/logos", (req, res) => {
	if (req.query.id) {
		postgres("logos")
			.join("categories", "logos.category", "=", "categories.category_id")
			.select(
				"logo_id",
				"logos.name",
				"logos.description",
				"categories.category_name",
				"logos.logo_img_url"
			)
			.where("logos.logo_id", "=", req.query.id)
			.then(r => res.json(r));
	} else {
		postgres("logos")
			.join("categories", "logos.category", "=", "categories.category_id")
			.select(
				"logo_id",
				"logos.name",
				"logos.description",
				"categories.category_name",
				"logos.logo_img_url"
			)
			.then(r => res.json(r));
	}
});

app.get("/add", (req, res) => {
	if (req.session.isLoggedIn === true) {
		res.render("add.html");
	} else {
		res.status(200).send();
	}
});

app.get("/delete", (req, res) => {
	if (req.session.isLoggedIn === true) {
		res.render("delete.html");
	} else {
		res.status(200).send();
	}
});

app.post("/delete", (req, res) => {
	if (req.session.isLoggedIn === true) {
		postgres
			.select("*")
			.from("logos")
			.where("logo_id", "=", req.body.id)
			.then(resp => {
				if (resp.length > 0)
					postgres("logos")
						.where("logo_id", req.body.id)
						.del()
						.then(() => res.json("wow"))
						.catch(console.log);
				else res.json("Wrong id");
			});
	} else {
		res.status(200).send();
	}
});

app.post("/signin", (req, res) => {
	const { username, password } = req.body;
	if (!username || !password) return res.render("login.html");
	postgres
		.select("hash")
		.from("login")
		.where("email", "=", username)
		.then(data => {
			bcrypt.compare(password, data[0].hash, function (err, result) {
				if (result) {
					req.session.isLoggedIn = true;
					res.render("choice.html");
				} else res.render("login.html");
			});
		})
		.catch(e => {
			console.log(e);
			res.render("login.html");
		});
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}.`);
});
