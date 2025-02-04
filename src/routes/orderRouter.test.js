const request = require("supertest");
const app = require("../service");
const { Role, DB } = require("../database/database.js");

let testAdmin = { name: "pizza admin", email: "reg@test.com", password: "a" };
let testAdminAuthToken;
//let testAdminID

let testDiner = { name: "pizza diner", email: "reg@test.com", password: "b" };
let testDinerAuthToken;

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + "@admin.com";

  user = await DB.addUser(user);
  return { ...user, password: "toomanysecrets" };
}

async function createDinerUser() {
  let user = { password: "2manysecrets", roles: [{ role: Role.Diner }] };
  user.name = randomName();
  user.email = user.name + "@diner.com";

  user = await DB.addUser(user);
  return { ...user, password: "2manysecrets" };
}

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/
  );
}

beforeAll(async () => {
  if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
  }
  //login admin
  testAdmin = await createAdminUser();
  const loginRes = await request(app).put("/api/auth").send(testAdmin);
  expect(loginRes.status).toBe(200);
  testAdminAuthToken = loginRes.body.token;
  //testAdminID = loginRes.body.user.id;
  expectValidJwt(testAdminAuthToken);

  //login diner
  testDiner = await createDinerUser();
  const loginRes2 = await request(app).put("/api/auth").send(testDiner);
  expect(loginRes2.status).toBe(200);
  testDinerAuthToken = loginRes2.body.token;
  expectValidJwt(testDinerAuthToken);
});

test("Get Menu", async () => {
  const getRes = await request(app).get("/api/order/menu");

  expect(getRes.status).toBe(200);
});

test("Add Menu Item", async () => {
  const getRes = await request(app)
    .put("/api/order/menu")
    .set("Authorization", `Bearer ${testAdminAuthToken}`)
    .send({
      title: randomName(),
      description: "No topping, no sauce, just carbs",
      image: "pizza9.png",
      price: 0.0001,
    });

  expect(getRes.status).toBe(200);
});

test("Add Menu Item", async () => {
  const getRes = await request(app)
    .put("/api/order/menu")
    .set("Authorization", `Bearer ${testDinerAuthToken}`)
    .send({
      title: randomName(),
      description: "No topping, no sauce, just carbs",
      image: "pizza9.png",
      price: 0.0001,
    });

  expect(getRes.status).toBe(403);
});

test("Get Orders", async () => {
  const getRes = await request(app)
    .get("/api/order")
    .set("Authorization", `Bearer ${testDinerAuthToken}`);

  expect(getRes.status).toBe(200);
});
