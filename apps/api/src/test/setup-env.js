process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgresql://track360:track360@127.0.0.1:5432/track360_test';
process.env.JWT_SECRET ||= 'track360-test-secret-with-more-than-32-characters';
process.env.DB_SSL ||= 'false';
