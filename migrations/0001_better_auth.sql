CREATE TABLE IF NOT EXISTS "user" (
  "id" text not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" integer not null,
  "image" text,
  "createdAt" date not null,
  "updatedAt" date not null
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text not null primary key,
  "expiresAt" date not null,
  "token" text not null unique,
  "createdAt" date not null,
  "updatedAt" date not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

CREATE INDEX IF NOT EXISTS "session_userId_idx" on "session" ("userId");

CREATE TABLE IF NOT EXISTS "account" (
  "id" text not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" date,
  "refreshTokenExpiresAt" date,
  "scope" text,
  "password" text,
  "createdAt" date not null,
  "updatedAt" date not null
);

CREATE INDEX IF NOT EXISTS "account_userId_idx" on "account" ("userId");

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" date not null,
  "createdAt" date not null,
  "updatedAt" date not null
);

CREATE INDEX IF NOT EXISTS "verification_identifier_idx" on "verification" ("identifier");

CREATE TABLE IF NOT EXISTS "apikey" (
  "id" text not null primary key,
  "configId" text not null,
  "name" text,
  "start" text,
  "referenceId" text not null,
  "prefix" text,
  "key" text not null,
  "refillInterval" integer,
  "refillAmount" integer,
  "lastRefillAt" date,
  "enabled" integer,
  "rateLimitEnabled" integer,
  "rateLimitTimeWindow" integer,
  "rateLimitMax" integer,
  "requestCount" integer,
  "remaining" integer,
  "lastRequest" date,
  "expiresAt" date,
  "createdAt" date not null,
  "updatedAt" date not null,
  "permissions" text,
  "metadata" text
);

CREATE INDEX IF NOT EXISTS "apikey_configId_idx" on "apikey" ("configId");
CREATE INDEX IF NOT EXISTS "apikey_key_idx" on "apikey" ("key");
CREATE INDEX IF NOT EXISTS "apikey_referenceId_idx" on "apikey" ("referenceId");
