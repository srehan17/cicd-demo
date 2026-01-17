const request = require("supertest");
const app = require("../app");

test("GET / returns success", async () => {
  const res = await request(app).get("/");
  expect(res.statusCode).toBe(200);
});
