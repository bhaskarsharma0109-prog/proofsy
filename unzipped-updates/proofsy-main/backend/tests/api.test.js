const request = require("supertest");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const app = require("../src/server");
const User = require("../src/models/User");
const Event = require("../src/models/Event");
const Certificate = require("../src/models/Certificate");

jest.mock("../src/workers/certificateWorker", () => ({
  queueCertificateGeneration: jest.fn().mockResolvedValue(true)
}));

let mockIdCounter = 0;
jest.mock("uuid", () => ({
  v4: () => `${(++mockIdCounter).toString().padStart(8, '0')}-abcd`
}));

// Use in-memory MongoDB for tests
let mongod;

beforeAll(async () => {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // Clear the uploads dir if it exists
  const uploadsDir = path.join(__dirname, "../uploads");
  if (fs.existsSync(uploadsDir)) {
    fs.rmSync(uploadsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(uploadsDir, { recursive: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  // Clear the uploads dir again
  const uploadsDir = path.join(__dirname, "../uploads");
  if (fs.existsSync(uploadsDir)) {
    fs.rmSync(uploadsDir, { recursive: true, force: true });
  }
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

describe("Proofsy API Tests", () => {

  describe("POST /api/users", () => {
    it("should handle duplicate user creation gracefully (upsert logic)", async () => {
      // First creation
      const res1 = await request(app)
        .post("/api/users")
        .send({ name: "John Doe", email: "john@example.com" });
      
      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.email).toBe("john@example.com");

      // Second creation with same email
      const res2 = await request(app)
        .post("/api/users")
        .send({ name: "John Doe", email: "john@example.com" });
      
      expect(res2.status).toBe(409); // /api/users rejects duplicates
      expect(res2.body.success).toBe(false);
      expect(res2.body.error).toContain("already exists");

      // Verify only 1 user in DB
      const userCount = await User.countDocuments();
      expect(userCount).toBe(1);
    });
  });

  describe("GET /api/verify/:code", () => {
    it("should return 404 for invalid verification codes", async () => {
      const res = await request(app).get("/api/verify/INVALID-CODE-123");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Invalid verification code or certificate not found.");
    });

    it("should verify a valid certificate", async () => {
      // Setup mock data
      const event = await Event.create({ name: "Test Event", date: new Date(), organizerName: "Acme" });
      const user = await User.create({ name: "Jane Doe", email: "jane@example.com" });
      const cert = await Certificate.create({
        userId: user._id,
        eventId: event._id,
        verificationCode: "VALID-123",
        status: "generated"
      });

      const res = await request(app).get("/api/verify/VALID-123");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isValid).toBe(true);
      expect(res.body.data.certificate.recipientName).toBe("Jane Doe");
    });
  });

  describe("POST /api/certificates/generate (Bulk Upload)", () => {
    it("should reject an empty CSV upload", async () => {
      const event = await Event.create({ name: "Test Event", date: new Date(), organizerName: "Acme" });
      
      // Create empty CSV
      const csvPath = path.join(__dirname, "empty.csv");
      fs.writeFileSync(csvPath, "name,email\n"); // Just headers

      const res = await request(app)
        .post("/api/certificates/generate")
        .field("eventId", event._id.toString())
        .attach("file", csvPath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("CSV is empty");

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    it("should process a valid CSV and generate certificates", async () => {
      const event = await Event.create({ name: "Test Event", date: new Date(), organizerName: "Acme" });
      
      // Create valid CSV
      const csvPath = path.join(__dirname, "valid.csv");
      fs.writeFileSync(csvPath, "name,email\nAlice,alice@example.com\nBob,bob@example.com");

      const res = await request(app)
        .post("/api/certificates/generate")
        .field("eventId", event._id.toString())
        .attach("file", csvPath);

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRowsProcessed).toBe(2);

      // Verify DB state
      const certs = await Certificate.find({ eventId: event._id });
      expect(certs.length).toBe(2);

      // Cleanup
      fs.unlinkSync(csvPath);
    });
  });
});
