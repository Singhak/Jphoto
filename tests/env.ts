import "dotenv/config";

/** Points lib/db at the test database before any test imports it. */
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is not set. See Tests in README.md.");
if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL must not be DATABASE_URL: the tests wipe it.");
process.env.DATABASE_URL = url;
// Payments read these; the Cashfree API itself is stubbed in the tests.
process.env.CASHFREE_APP_ID = "test-app";
process.env.CASHFREE_SECRET_KEY = "test-secret";
process.env.CASHFREE_ENV = "sandbox";
