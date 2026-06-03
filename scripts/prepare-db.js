const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const dbUrl = process.env.DATABASE_URL || "file:./dev.db";

let schema = fs.readFileSync(schemaPath, 'utf8');

const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

if (isPostgres) {
  console.log('Detected PostgreSQL connection. Setting Prisma provider to "postgresql"...');
  schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
} else {
  console.log('Detected SQLite connection. Setting Prisma provider to "sqlite"...');
  schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Prisma schema updated successfully.');
