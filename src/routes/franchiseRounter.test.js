const request = require("supertest");
const app = require("../service");
const { Role, DB } = require("../database/database.js");

let testAdmin = { name: "pizza admin", email: "reg@test.com", password: "a" };
let testAdminAuthToken;
let testAdminID;

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
  testAdminID = loginRes.body.user.id;
  expectValidJwt(testAdminAuthToken);

  //login diner
  testDiner = await createDinerUser();
  const loginRes2 = await request(app).put("/api/auth").send(testDiner);
  expect(loginRes2.status).toBe(200);
  testDinerAuthToken = loginRes2.body.token;
  expectValidJwt(testDinerAuthToken);
});

test("Get All Franchises", async () => {
  const getRes = await request(app).get("/api/franchise");

  expect(getRes.status).toBe(200);
});

test("Get User Franchises", async () => {
  const getRes = await request(app)
    .get(`/api/franchise/${testAdminID}`)
    .set("Authorization", `Bearer ${testAdminAuthToken}`);

  expect(getRes.status).toBe(200);
});

async function createFranchise() {
  const creationRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${testAdminAuthToken}`)
    .send({
      stores: [],
      id: "",
      name: `${testAdmin.name}'s franchise: ${randomName()}`,
      admins: [{ email: testAdmin.email }],
    });

  expect(creationRes.status).toBe(200);
  return creationRes;
}

test("Create Franchise", async () => {
  await createFranchise();
});

test("Create Franchise sad case", async () => {
  const creationRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${testDinerAuthToken}`)
    .send({
      stores: [],
      id: "",
      name: `${testDiner.name}'s franchise`,
      admins: [{ email: testDiner.email }],
    });

  expect(creationRes.status).toBe(403);
});

test("Delete Franchise", async () => {
  let creationRes = await createFranchise();
  const deleteRes = await request(app)
    .delete(`/api/franchise/${creationRes.body.id}`)
    .set("Authorization", `Bearer ${testAdminAuthToken}`);

  expect(deleteRes.status).toBe(200);
});

test("Delete Franchise sad case", async () => {
  let creationRes = await createFranchise();
  const deleteRes = await request(app)
    .delete(`/api/franchise/${creationRes.body.id}`)
    .set("Authorization", `Bearer ${testDinerAuthToken}`);

  expect(deleteRes.status).toBe(403);
});

async function createStore() {
  let franchiseCreRes = await createFranchise();
  const storeCreRes = await request(app)
    .post(`/api/franchise/${franchiseCreRes.body.id}/store`)
    .set("Authorization", `Bearer ${testAdminAuthToken}`)
    .send({ franchiseId: `${franchiseCreRes.body.id}`, name: randomName() });

  expect(storeCreRes.status).toBe(200);
  return { storeCreRes, franchiseCreRes };
}

test("Create Store", async () => {
  await createStore();
});

test("Create Store sad case", async () => {
  let franchiseCreRes = await createFranchise();
  const storeCreRes = await request(app)
    .post(`/api/franchise/${franchiseCreRes.body.id}/store`)
    .set("Authorization", `Bearer ${testDinerAuthToken}`)
    .send({ franchiseId: `${franchiseCreRes.body.id}`, name: randomName() });

  expect(storeCreRes.status).toBe(403);
});

test("Delete Store", async () => {
  const { storeCreRes, franchiseCreRes } = await createStore();
  const deleteRes = await request(app)
    .delete(
      `/api/franchise/${franchiseCreRes.body.id}/store/${storeCreRes.body.id}`
    )
    .set("Authorization", `Bearer ${testAdminAuthToken}`);

  expect(deleteRes.status).toBe(200);
});

test("Delete Store sad case", async () => {
  const { storeCreRes, franchiseCreRes } = await createStore();
  const deleteRes = await request(app)
    .delete(
      `/api/franchise/${franchiseCreRes.body.id}/store/${storeCreRes.body.id}`
    )
    .set("Authorization", `Bearer ${testDinerAuthToken}`);

  expect(deleteRes.status).toBe(403);
});
