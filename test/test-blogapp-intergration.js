const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the should syntax available throughout
// this module
const should = chai.should();

const {Post} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

// used to put randomish documents in db
// so we have data to work with and assert about.
// we use the Faker library to automatically
// generate placeholder values for author, title, content
// and then we insert that data into mongo
function seedPostData() {
  const seedData = [];

  for (let i=1; i<=10; i++) {
    seedData.push(generatePostData());
  }
  // this will return a promise
  return Post.insertMany(seedData);
};


// generate an object represnting a restaurant.
// can be used to generate seed data for db
// or request.body data
function generatePostData() {
  return {
    title: faker.company.companyName(),
    content: faker.lorem.paragraph(),
   author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    created: faker.date.past(),
  }
}

// this function deletes the entire database.
// we'll call it in an `afterEach` block below
// to ensure  ata from one test does not stick
// around for next one
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Post API resource', function() {

  // we need each of these hook functions to return a promise
  // otherwise we'd need to call a `done` callback. `runServer`,
  // `seedRestaurantData` and `tearDownDb` each return a promise,
  // so we return the value returned by these function calls.
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedPostData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  })

  // note the use of nested `describe` blocks.
  // this allows us to make clearer, more discrete tests that focus
  // on proving something small
  describe('GET endpoint', function() {

    it('should return all existing posts', function() {
      // strategy:
      //    1. get back all restaurants returned by by GET request to `/restaurants`
      //    2. prove res has right status, data type
      //    3. prove the number of restaurants we got back is equal to number
      //       in db.
      //
      // need to have access to mutate and access `res` across
      // `.then()` calls below, so declare it here so can modify in place
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          // so subsequent .then blocks can access resp obj.
          res = _res;
          res.should.have.status(200);
          // otherwise our db seeding didn't work
          res.body.posts.should.have.length.of.at.least(1);
          return Post.count();
        })
        .then(function(count) {
          res.body.restaurants.should.have.length.of(count);
        });
    });


    it('should return posts with right fields', function() {
      // Strategy: Get back all restaurants, and ensure they have expected keys

      let resPost;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          res.should.have.status(200);
          res.should.be.json;
          res.body.posts.should.be.a('array');
          res.body.posts.should.have.length.of.at.least(1);

          res.body.posts.forEach(function(restaurant) {
            post.should.be.a('object');
            post.should.include.keys(
              'created', 'title', 'content', 'author');
          });
          resPost = res.body.post[0];
          return Post.findById(resPost.id);
        })
        .then(function(restaurant) {

          resPost.title.should.equal(post.title);
          resRestaurant.content.should.equal(post.content);
          resRestaurant.author.should.equal(post.author);
        });
    });
  });

  describe('POST endpoint', function() {
    it('should add a new post', function() {

      const newPost = generatePostData();
      let mostRecentAuthor;

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys(
            'title', 'content', 'author');
          res.body.name.should.equal(newPost.title);
          // cause Mongo should have created id on insertion
          res.body.id.should.not.be.null;
          res.body.title.should.equal(newPost.title);
          res.body.author.should.equal(newPost.author);
          return Post.findById(res.body.id);
        })
        .then(function(restaurant) {
          post.title.should.equal(newPost.title);
          post.content.should.equal(newPost.content);
        });
    });
  });

  describe('PUT endpoint', function() {

    it('should update fields you send over', function() {
      const updateData = {
        title: 'fofofofofofofof',
        content: 'futuristic fusion'
      };

      return Post
        .findOne()
        .then(function(post) {
          updateData.id = post.id;

          // make request then inspect it to make sure it reflects
          // data we sent
          return chai.request(app)
            .put(`/posts/${posts.id}`)
            .send(updateData);
        })
        .then(function(res) {
          res.should.have.status(204);

          return Post.findById(updateData.id);
        })
        .then(function(post) {
          post.title.should.equal(updateData.title);
          post.content.should.equal(updateData.content);
        });
      });
  });

  describe('DELETE endpoint', function() {
    // strategy:
    //  1. get a restaurant
    //  2. make a DELETE request for that restaurant's id
    //  3. assert that response has right status code
    //  4. prove that restaurant with the id doesn't exist in db anymore
    it('delete a post by id', function() {

      let post;

      return Post
        .findOne()
        .then(function(_post) {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(function(res) {
          res.should.have.status(204);
          return Post.findById(post.id);
        })
        .then(function(_post) {
          // when a variable's value is null, chaining `should`
          // doesn't work. so `_restaurant.should.be.null` would raise
          // an error. `should.be.null(_restaurant)` is how we can
          // make assertions about a null value.
          should.not.exist(_post);
        });
    });
  });
});
