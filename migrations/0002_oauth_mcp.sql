CREATE TABLE IF NOT EXISTS "jwks" (
  "id" text not null primary key,
  "publicKey" text not null,
  "privateKey" text not null,
  "createdAt" date not null,
  "expiresAt" date,
  "alg" text,
  "crv" text
);

CREATE TABLE IF NOT EXISTS "rateLimit" (
  "id" text not null primary key,
  "key" text not null unique,
  "count" integer not null,
  "lastRequest" bigint not null
);

CREATE TABLE IF NOT EXISTS "oauthClientAssertion" (
  "id" text not null primary key,
  "expiresAt" date not null
);

CREATE TABLE IF NOT EXISTS "oauthResource" (
  "id" text not null primary key,
  "identifier" text not null unique,
  "name" text not null,
  "accessTokenTtl" integer,
  "refreshTokenTtl" integer,
  "signingAlgorithm" text,
  "signingKeyId" text,
  "allowedScopes" text,
  "customClaims" text,
  "dpopBoundAccessTokensRequired" integer,
  "disabled" integer,
  "createdAt" date,
  "updatedAt" date,
  "policyVersion" integer,
  "metadata" text
);

CREATE TABLE IF NOT EXISTS "oauthClient" (
  "id" text not null primary key,
  "clientId" text not null unique,
  "clientSecret" text,
  "clientDiscoveryId" text,
  "disabled" integer,
  "skipConsent" integer,
  "enableEndSession" integer,
  "subjectType" text,
  "scopes" text,
  "clientCredentialsScopes" text,
  "userId" text references "user" ("id") on delete cascade,
  "createdAt" date,
  "updatedAt" date,
  "name" text,
  "uri" text,
  "icon" text,
  "contacts" text,
  "tos" text,
  "policy" text,
  "softwareId" text,
  "softwareVersion" text,
  "softwareStatement" text,
  "redirectUris" text not null,
  "postLogoutRedirectUris" text,
  "backchannelLogoutUri" text,
  "backchannelLogoutSessionRequired" integer,
  "tokenEndpointAuthMethod" text,
  "applicationType" text,
  "jwks" text,
  "jwksUri" text,
  "grantTypes" text,
  "responseTypes" text,
  "requirePKCE" integer,
  "dpopBoundAccessTokens" integer,
  "referenceId" text,
  "metadata" text
);

CREATE INDEX IF NOT EXISTS "oauthClient_userId_idx" on "oauthClient" ("userId");

CREATE TABLE IF NOT EXISTS "oauthClientResource" (
  "id" text not null primary key,
  "clientId" text not null references "oauthClient" ("clientId") on delete cascade,
  "resourceId" text not null references "oauthResource" ("identifier") on delete cascade,
  "metadata" text,
  "createdAt" date
);

CREATE INDEX IF NOT EXISTS "oauthClientResource_clientId_idx" on "oauthClientResource" ("clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "oauthClientResource_clientId_resourceId_uidx" on "oauthClientResource" ("clientId", "resourceId");
CREATE INDEX IF NOT EXISTS "oauthClientResource_resourceId_idx" on "oauthClientResource" ("resourceId");

CREATE TABLE IF NOT EXISTS "oauthRefreshToken" (
  "id" text not null primary key,
  "token" text not null unique,
  "clientId" text not null references "oauthClient" ("clientId") on delete cascade,
  "sessionId" text references "session" ("id") on delete set null,
  "userId" text not null references "user" ("id") on delete cascade,
  "referenceId" text,
  "authorizationCodeId" text,
  "resources" text,
  "requestedUserInfoClaims" text,
  "expiresAt" date not null,
  "createdAt" date not null,
  "revoked" date,
  "rotatedAt" date,
  "rotationReplayResponse" text,
  "rotationReplayExpiresAt" date,
  "authTime" date,
  "confirmation" text,
  "scopes" text not null
);

CREATE INDEX IF NOT EXISTS "oauthRefreshToken_authorizationCodeId_idx" on "oauthRefreshToken" ("authorizationCodeId");
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_clientId_idx" on "oauthRefreshToken" ("clientId");
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_sessionId_idx" on "oauthRefreshToken" ("sessionId");
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_userId_idx" on "oauthRefreshToken" ("userId");

CREATE TABLE IF NOT EXISTS "oauthAccessToken" (
  "id" text not null primary key,
  "token" text not null unique,
  "clientId" text not null references "oauthClient" ("clientId") on delete cascade,
  "sessionId" text references "session" ("id") on delete set null,
  "userId" text references "user" ("id") on delete cascade,
  "referenceId" text,
  "authorizationCodeId" text,
  "resources" text,
  "requestedUserInfoClaims" text,
  "refreshId" text references "oauthRefreshToken" ("id") on delete cascade,
  "expiresAt" date not null,
  "createdAt" date not null,
  "revoked" date,
  "confirmation" text,
  "scopes" text not null
);

CREATE INDEX IF NOT EXISTS "oauthAccessToken_authorizationCodeId_idx" on "oauthAccessToken" ("authorizationCodeId");
CREATE INDEX IF NOT EXISTS "oauthAccessToken_clientId_idx" on "oauthAccessToken" ("clientId");
CREATE INDEX IF NOT EXISTS "oauthAccessToken_refreshId_idx" on "oauthAccessToken" ("refreshId");
CREATE INDEX IF NOT EXISTS "oauthAccessToken_sessionId_idx" on "oauthAccessToken" ("sessionId");
CREATE INDEX IF NOT EXISTS "oauthAccessToken_userId_idx" on "oauthAccessToken" ("userId");

CREATE TABLE IF NOT EXISTS "oauthConsent" (
  "id" text not null primary key,
  "clientId" text not null references "oauthClient" ("clientId") on delete cascade,
  "userId" text references "user" ("id") on delete cascade,
  "referenceId" text,
  "resources" text,
  "requestedUserInfoClaims" text,
  "scopes" text not null,
  "createdAt" date not null,
  "updatedAt" date not null
);

CREATE INDEX IF NOT EXISTS "oauthConsent_clientId_idx" on "oauthConsent" ("clientId");
CREATE INDEX IF NOT EXISTS "oauthConsent_userId_idx" on "oauthConsent" ("userId");
