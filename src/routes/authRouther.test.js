const request = require("supertest");
const app = require("../service");
const { authRouter, setAuthUser } = require("./authRouter");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;
let testUserID;

beforeAll(async () => {
  if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
  }
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserID = registerRes.body.user.id;
  expectValidJwt(testUserAuthToken);
});

test("setAuthUser", async () => {
  const mockNext = jest.fn();
  await setAuthUser(
    { headers: { authorization: "Bearer " + testUserAuthToken } },
    {},
    mockNext
  );

  expect(mockNext).toHaveBeenCalledTimes(1);
});

test("authenticateToken sad case", () => {
  const mockNext = jest.fn();

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };

  authRouter.authenticateToken({}, mockRes, mockNext);
  expect(mockRes.status).toHaveBeenCalledWith(401);
  expect(mockNext).toHaveBeenCalledTimes(0);
});

test("authenticateToken happy case", () => {
  const mockNext = jest.fn();

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };

  authRouter.authenticateToken({ user: testUser }, mockRes, mockNext);
  expect(mockRes.status).toHaveBeenCalledTimes(0);
  expect(mockNext).toHaveBeenCalledTimes(1);
});

test("register", async () => {
  const user = { name: "pizza diner", email: "reg@test.com", password: "a" };
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registrationRes = await request(app).post("/api/auth").send(user);
  expect(registrationRes.status).toBe(200);
  expectValidJwt(registrationRes.body.token);

  const expectedUser = { ...user, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(registrationRes.body.user).toMatchObject(expectedUser);
});

test("register without password", async () => {
  const user = { name: "pizza diner", email: "reg@test.com" };
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registrationRes = await request(app).post("/api/auth").send(user);
  expect(registrationRes.status).toBe(400);
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test("logout", async () => {
  const user = { name: "pizza diner", email: "reg@test.com", password: "a" };
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registrationRes = await request(app).post("/api/auth").send(user);
  const userToken = registrationRes.body.token;
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${userToken}`);

  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe("logout successful");
});

test("updateUser", async () => {
  const updateUserRes = await request(app)
    .put(`/api/auth/${testUserID}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(testUser);

  expect(updateUserRes.status).toBe(200);
});

test("updateUser sad case", async () => {
  const updateUserRes = await request(app)
    .put(`/api/auth/${testUserID + 1}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(testUser);

  expect(updateUserRes.status).toBe(403);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/
  );
}
