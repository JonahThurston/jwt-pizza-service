const request = require("supertest");
const app = require("../service");

test("Get All Franchises", async () => {
  const getRes = await request(app).get("/api/order/menu");

  expect(getRes.status).toBe(200);
});
